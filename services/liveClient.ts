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
  private hasSentGreeting: boolean = false;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
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
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
      this.sessionPromise.then((session) => {
        this.triggerInitialGreeting(session);
      }).catch((err) => {
        console.error("Unable to start session", err);
        this.onError("Could not start AI session.");
      });
      this.onConnectionStateChange(true);

    } catch (err) {
      console.error("Failed to connect:", err);
      this.onError("Could not access microphone or connect to AI.");
      this.disconnect();
    }
  }

  private triggerInitialGreeting(session: any) {
    if (this.hasSentGreeting) return;
    this.hasSentGreeting = true;
    session.sendRealtimeInput({
      text:
        "The user just started a new conversation. Introduce yourself as Soundscape Brantford and explain you can share weather, construction updates, or upcoming events. Ask which one they would like first.",
    });
  }

  private handleOpen() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    // Setup Audio Streaming Pipeline
    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      this.onVolumeUpdate(Math.sqrt(sum / inputData.length));

      // Send to Gemini
      const blob = createGeminiAudioBlob(inputData);
      this.sessionPromise!.then((session) => {
        session.sendRealtimeInput({ media: blob });
      });
    };

    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext) {
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

    // 2. Handle Tool Calls
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

  public disconnect() {
    if (this.sessionPromise) {
        // There is no explicit .close() on the promise wrapper in some versions, 
        // but we can stop sending data.
        this.sessionPromise = null;
    }
    this.hasSentGreeting = false;
    
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
    this.onConnectionStateChange(false);
    this.onDisplayUpdate({ type: null });
  }
}

export const liveClient = new LiveClient();