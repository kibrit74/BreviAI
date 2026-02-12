/**
 * Gemini Live API Service
 * 
 * Manages WebSocket connection to Gemini Live API for real-time
 * bidirectional audio streaming with tool calling support.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { getGeminiTools } from './ToolRegistry';
import { userSettingsService } from './UserSettingsService';

const TAG = '[GeminiLive]';

// Types
export interface RealtimeAIConfig {
    apiKey: string;
    model?: string;
    systemInstruction?: string;
    voice?: string;
    tools?: boolean;
    speakerMode?: boolean; // Route audio to loudspeaker (for phone call scenarios)
    onTranscript?: (text: string, isUser: boolean) => void;
    onToolCall?: (name: string, args: any) => Promise<any>;
    onError?: (error: string) => void;
    onStateChange?: (state: 'connecting' | 'connected' | 'disconnected') => void;
}

interface LiveMessage {
    setup?: any;
    realtimeInput?: any;
    toolResponse?: any;
    clientContent?: any;
}

type SessionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

const GeminiLiveAudio = Platform.OS === 'android'
    ? NativeModules.GeminiLiveAudioModule
    : null;

export class GeminiLiveService {
    private ws: WebSocket | null = null;
    private config: RealtimeAIConfig | null = null;
    private state: SessionState = 'idle';
    private audioEmitter: NativeEventEmitter | null = null;
    private audioSubscription: any = null;
    private responseQueue: any[] = [];
    private isProcessingTurn: boolean = false;

    /**
     * Start a live session with Gemini
     */
    async connect(config: RealtimeAIConfig): Promise<void> {
        this.config = config;
        this.setState('connecting');

        const model = config.model || 'gemini-2.0-flash-live-001';
        const apiKey = config.apiKey;

        // WebSocket URL for Gemini Live API
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        console.log(`${TAG} Connecting to Gemini Live API...`);
        console.log(`${TAG} Model: ${model}`);

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log(`${TAG} WebSocket connected`);
                    this.sendSetupMessage(model, config);
                    this.setState('connected');
                    this.startAudioCapture();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (event: any) => {
                    console.error(`${TAG} WebSocket error:`, event.message);
                    config.onError?.(`Bağlantı hatası: ${event.message}`);
                    reject(new Error(event.message));
                };

                this.ws.onclose = (event) => {
                    console.log(`${TAG} WebSocket closed: ${event.code} ${event.reason}`);
                    this.setState('disconnected');
                    this.stopAudioCapture();
                };
            } catch (error: any) {
                console.error(`${TAG} Connect error:`, error);
                reject(error);
            }
        });
    }

    /**
     * Send setup message with model configuration
     */
    private sendSetupMessage(model: string, config: RealtimeAIConfig): void {
        const setupMessage: any = {
            setup: {
                model: `models/${model}`,
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: config.voice || 'Kore'
                            }
                        }
                    }
                }
            }
        };

        // Add system instruction
        if (config.systemInstruction) {
            setupMessage.setup.systemInstruction = {
                parts: [{ text: config.systemInstruction }]
            };
        }

        // Add tools from ToolRegistry
        if (config.tools) {
            const geminiTools = getGeminiTools();
            setupMessage.setup.tools = geminiTools;
        }

        this.sendMessage(setupMessage);
        console.log(`${TAG} Setup message sent`);
    }

    /**
     * Start capturing audio from microphone and sending to Gemini
     */
    private async startAudioCapture(): Promise<void> {
        if (!GeminiLiveAudio) {
            console.warn(`${TAG} Native audio module not available`);
            return;
        }

        try {
            // Initialize playback with speaker mode if requested
            if (this.config?.speakerMode) {
                console.log(`${TAG} Initializing playback with SPEAKER MODE`);
                await GeminiLiveAudio.initPlaybackWithSpeaker(true);
            } else {
                await GeminiLiveAudio.initPlayback();
            }

            // Set up audio event listener
            this.audioEmitter = new NativeEventEmitter(GeminiLiveAudio);
            this.audioSubscription = this.audioEmitter.addListener(
                'onAudioCaptured',
                (event: { data: string; size: number }) => {
                    this.sendAudioChunk(event.data);
                }
            );

            // Start capturing
            await GeminiLiveAudio.startCapture();
            console.log(`${TAG} Audio capture started`);
        } catch (error) {
            console.error(`${TAG} Audio capture error:`, error);
        }
    }

    /**
     * Stop audio capture
     */
    private async stopAudioCapture(): Promise<void> {
        if (!GeminiLiveAudio) return;

        try {
            this.audioSubscription?.remove();
            this.audioSubscription = null;

            await GeminiLiveAudio.stopCapture();
            await GeminiLiveAudio.stopPlayback();

            // Reset speaker mode if it was enabled
            if (this.config?.speakerMode) {
                try {
                    await GeminiLiveAudio.setSpeakerMode(false);
                    console.log(`${TAG} Speaker mode disabled`);
                } catch (e) {
                    console.warn(`${TAG} Could not reset speaker mode:`, e);
                }
            }

            console.log(`${TAG} Audio capture stopped`);
        } catch (error) {
            console.error(`${TAG} Stop capture error:`, error);
        }
    }

    /**
     * Send audio chunk to Gemini via WebSocket
     */
    private sendAudioChunk(base64Data: string): void {
        if (this.ws?.readyState !== WebSocket.OPEN) return;

        const message = {
            realtimeInput: {
                mediaChunks: [{
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64Data
                }]
            }
        };

        this.sendMessage(message);
    }

    /**
     * Handle incoming message from Gemini
     */
    private async handleMessage(rawData: string): Promise<void> {
        try {
            const message = JSON.parse(rawData);

            // Setup complete acknowledgment
            if (message.setupComplete) {
                console.log(`${TAG} Setup complete, session ready`);
                return;
            }

            // Server content (audio/text response)
            if (message.serverContent) {
                const content = message.serverContent;

                // Model turn - audio or text parts
                if (content.modelTurn?.parts) {
                    for (const part of content.modelTurn.parts) {
                        // Audio response → play it
                        if (part.inlineData?.data) {
                            await this.playAudioResponse(part.inlineData.data);
                        }
                        // Text response
                        if (part.text) {
                            console.log(`${TAG} Gemini text:`, part.text);
                            this.config?.onTranscript?.(part.text, false);
                        }
                    }
                }

                // Turn complete
                if (content.turnComplete) {
                    console.log(`${TAG} Turn complete`);
                }

                // Interrupted (barge-in)
                if (content.interrupted) {
                    console.log(`${TAG} Response interrupted (barge-in)`);
                    // Clear playback buffer
                    if (GeminiLiveAudio) {
                        await GeminiLiveAudio.clearPlaybackBuffer();
                    }
                }
            }

            // Tool call from Gemini
            if (message.toolCall) {
                console.log(`${TAG} Tool call received:`, message.toolCall);
                await this.handleToolCall(message.toolCall);
            }

        } catch (error) {
            console.error(`${TAG} Message parse error:`, error);
        }
    }

    /**
     * Play audio response from Gemini
     */
    private async playAudioResponse(base64Data: string): Promise<void> {
        if (!GeminiLiveAudio) return;

        try {
            await GeminiLiveAudio.playAudioChunk(base64Data);
        } catch (error) {
            console.error(`${TAG} Playback error:`, error);
        }
    }

    /**
     * Handle tool calls from Gemini
     */
    private async handleToolCall(toolCall: any): Promise<void> {
        if (!this.config?.onToolCall) {
            console.warn(`${TAG} No tool executor configured`);
            return;
        }

        const functionCalls = toolCall.functionCalls || [];
        const functionResponses: any[] = [];

        for (const call of functionCalls) {
            console.log(`${TAG} Executing tool: ${call.name}`, call.args);

            try {
                const result = await this.config.onToolCall(call.name, call.args);
                functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { result: JSON.stringify(result) }
                });
                console.log(`${TAG} Tool ${call.name} completed`);
            } catch (error: any) {
                functionResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { error: error.message }
                });
                console.error(`${TAG} Tool ${call.name} failed:`, error);
            }
        }

        // Send tool responses back to Gemini
        if (functionResponses.length > 0) {
            this.sendMessage({
                toolResponse: {
                    functionResponses
                }
            });
        }
    }

    /**
     * Send a text message to the conversation
     */
    sendText(text: string): void {
        if (this.ws?.readyState !== WebSocket.OPEN) return;

        this.sendMessage({
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{ text }]
                }],
                turnComplete: true
            }
        });

        this.config?.onTranscript?.(text, true);
    }

    /**
     * Disconnect the live session
     */
    async disconnect(): Promise<void> {
        console.log(`${TAG} Disconnecting...`);

        await this.stopAudioCapture();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.setState('disconnected');
        console.log(`${TAG} Disconnected`);
    }

    /**
     * Check if session is active
     */
    isConnected(): boolean {
        return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get current state
     */
    getState(): SessionState {
        return this.state;
    }

    // --- Helpers ---

    private sendMessage(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private setState(state: SessionState): void {
        this.state = state;
        this.config?.onStateChange?.(state as any);
    }
}

// Singleton instance
export const geminiLiveService = new GeminiLiveService();
