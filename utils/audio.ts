import { Blob } from '@google/genai';

/**
 * Encodes a Float32Array of PCM audio data to a base64 string.
 * This is used for sending audio from the microphone to Gemini.
 */
export function encodePCM(inputData: Float32Array): string {
  const l = inputData.length;
  // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, inputData[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Convert Int16 buffer to binary string
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string to a Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts raw PCM data (Uint8Array) into an AudioBuffer for playback.
 */
export async function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Create the specific Blob structure required by the Gemini Live API client
 */
export function createGeminiAudioBlob(data: Float32Array): Blob {
    return {
      data: encodePCM(data),
      mimeType: 'audio/pcm;rate=16000',
    };
}