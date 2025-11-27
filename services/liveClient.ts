import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { createGeminiAudioBlob, decodeBase64, pcmToAudioBuffer } from "../utils/audio";
import { getUpcomingConstructionUpdates, getUpcomingEvents, SYSTEM_INSTRUCTION } from "../constants";
import { DisplayInfo } from "../types";
import { fetchBrantfordWeather } from "./weather";

// --- Tool Definitions ---

const getWeatherTool: FunctionDeclaration = {
  name: 'getWeather',
  description: 'Get the current weather for Brantford.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: 'The city name, e.g., Brantford' }
    },
    required: []
  }
};

const getConstructionTool: FunctionDeclaration = {
  name: 'getConstructionUpdates',
  description: 'Get current road construction updates and traffic alerts for Brantford.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: 'The city name' }
    },
    required: []
  }
};

const getEventsTool: FunctionDeclaration = {
  name: 'getUpcomingEvents',
  description: 'Get a list of upcoming community events in Brantford.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: 'The city name' }
    },
    required: []
  }
};

// --- Service Class ---

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sessionPromise: Promise<any> | null = null;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private shouldSendAudio: boolean = false; // Flag to control when to start sending audio
  
  // Callbacks for UI updates
  public onDisplayUpdate: (info: DisplayInfo) => void = () => {};
  public onConnectionStateChange: (state: boolean) => void = () => {};
  public onError: (error: string) => void = () => {};
  public onVolumeUpdate: (volume: number) => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async connect() {
    try {
      // Clean up any existing session resources (but don't call callbacks)
      this.cleanupResources();
      
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Resume audio contexts (browsers require user interaction)
      if (this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [getWeatherTool, getConstructionTool, getEventsTool] }]
        },
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: () => {
            console.log('Session closed');
            this.onConnectionStateChange(false);
          },
          onerror: (e: ErrorEvent) => {
            console.error(e);
            this.onError('Connection error occurred.');
            this.disconnect();
          }
        }
      };

      this.sessionPromise = this.ai.live.connect(config);
      this.onConnectionStateChange(true);

    } catch (err) {
      console.error("Failed to connect:", err);
      this.onError("Could not access microphone or connect to AI.");
      this.disconnect();
    }
  }

  private handleOpen() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    console.log('handleOpen called - setting up new session');
    
    // DON'T send audio yet - wait for AI to speak first
    this.shouldSendAudio = false;

    // Trigger initial greeting IMMEDIATELY with both text and a silence audio chunk
    // The silence chunk helps trigger the API to respond
    this.sessionPromise.then((session) => {
      console.log('Session opened, sending initial greeting for new session');
      
      // Send text prompt - keep it simple to avoid duplication with system instruction
      session.sendRealtimeInput({
        text: "The user just started the conversation. Please introduce yourself now and explain your capabilities.",
      });
      
      // Send a small silence audio chunk to trigger the API to respond
      // Create a silence buffer (all zeros)
      const silenceBuffer = new Float32Array(1600); // ~100ms of silence at 16kHz
      const silenceBlob = createGeminiAudioBlob(silenceBuffer);
      
      // Send silence chunk immediately after text
      setTimeout(() => {
        session.sendRealtimeInput({ media: silenceBlob });
        console.log('Sent silence chunk to trigger AI response');
      }, 100);
      
      // Audio will be enabled automatically when AI starts speaking (first audio chunk received)
      // This fallback ensures audio is enabled even if something goes wrong
      setTimeout(() => {
        if (!this.shouldSendAudio) {
          console.log('Fallback: Enabling audio input after timeout');
          this.shouldSendAudio = true;
        }
      }, 5000);
    });

    // Setup Audio Streaming Pipeline (but don't send audio yet)
    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer (always do this)
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      this.onVolumeUpdate(Math.sqrt(sum / inputData.length));

      // Only send audio to Gemini if flag is enabled
      if (this.shouldSendAudio) {
        const blob = createGeminiAudioBlob(inputData);
        this.sessionPromise!.then((session) => {
          session.sendRealtimeInput({ media: blob });
        });
      }
    };

    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio Output
    const sc = message.serverContent as any;
    
    // Skip status-only messages
    if (sc && (sc.setupComplete || sc.generationComplete || sc.turnComplete)) {
      return;
    }
    
    let base64Audio: string | undefined;
    
    // Look for audio in modelTurn.parts
    if (sc?.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || '';
          if (mimeType.includes('audio') || mimeType.includes('pcm') || mimeType === '') {
            base64Audio = part.inlineData.data;
            break;
          }
        }
      }
    }
    
    // Also check direct inlineData
    if (!base64Audio && sc?.inlineData?.data) {
      base64Audio = sc.inlineData.data;
    }
    
    if (base64Audio && this.outputAudioContext) {
      // AI is speaking - enable audio input now so user can respond
      if (!this.shouldSendAudio) {
        console.log('AI started speaking, enabling audio input');
        this.shouldSendAudio = true;
      }
      
      // Ensure audio context is running
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }
      
      try {
        const audioData = decodeBase64(base64Audio);
        
        // Use current time or next scheduled time, whichever is later
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

        const audioBuffer = await pcmToAudioBuffer(audioData, this.outputAudioContext, 24000, 1);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
      } catch (e) {
        console.error("Error decoding audio response:", e);
      }
    }

    // Handle Tool Calls
    if (message.toolCall) {
      this.handleToolCalls(message.toolCall);
    }
  }

  private async handleToolCalls(toolCall: any) {
    if (!this.sessionPromise) return;

    for (const fc of toolCall.functionCalls) {
      let result: any = {};
      
      console.log(`Executing tool: ${fc.name}`);

      try {
        switch (fc.name) {
          case 'getWeather': {
            result = await fetchBrantfordWeather();
            this.onDisplayUpdate({ type: 'WEATHER', data: result });
            break;
          }
          case 'getConstructionUpdates': {
            result = getUpcomingConstructionUpdates();
            this.onDisplayUpdate({ type: 'CONSTRUCTION', data: result });
            break;
          }
          case 'getUpcomingEvents': {
            result = getUpcomingEvents();
            this.onDisplayUpdate({ type: 'EVENTS', data: result });
            break;
          }
          default:
            result = { error: "Unknown tool" };
        }
      } catch (error) {
        console.error(`Tool ${fc.name} failed`, error);
        result = { error: (error as Error).message ?? "Tool execution failed" };
        this.onError(result.error);
      }

      // Send Response Back to Gemini
      this.sessionPromise.then((session) => {
        session.sendToolResponse({
          functionResponses: {
            id: fc.id,
            name: fc.name,
            response: { result: result }
          }
        });
      });
    }
  }

  private cleanupResources() {
    // Clean up resources without calling callbacks (used when reconnecting)
    if (this.sessionPromise) {
        this.sessionPromise = null;
    }
    
    this.shouldSendAudio = false;
    this.nextStartTime = 0;
    
    if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
    }
    if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }

  public disconnect() {
    // Reset all state for a clean disconnect
    this.cleanupResources();
    this.onConnectionStateChange(false);
    this.onDisplayUpdate({ type: null });
  }
}

export const liveClient = new LiveClient();
