/**
 * Gemini Live API Service
 * 
 * Manages WebSocket connection to Gemini Live API for real-time
 * bidirectional audio streaming with tool calling support.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { getGeminiTools } from './ToolRegistry';
import { userSettingsService } from './UserSettingsService';
import * as Speech from 'expo-speech';

const TAG = '[GeminiLive]';
const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEPRECATED_LIVE_MODELS = new Set([
    'gemini-2.0-flash-live-001',
    'gemini-live-2.5-flash-preview',
    'gemini-2.5-flash-live-001',
]);

function normalizeLiveModel(rawModel?: string): string {
    const model = (rawModel || '').trim().replace(/^models\//, '');
    if (!model) {
        return DEFAULT_LIVE_MODEL;
    }
    if (DEPRECATED_LIVE_MODELS.has(model)) {
        console.warn(`${TAG} Live model "${model}" is deprecated/unsupported. Using "${DEFAULT_LIVE_MODEL}" instead.`);
        return DEFAULT_LIVE_MODEL;
    }
    return model;
}

// Types
export interface RealtimeAIConfig {
    apiKey: string;
    model?: string;
    systemInstruction?: string;
    voice?: string;
    tools?: boolean;
    speakerMode?: boolean; // Route audio to loudspeaker (for phone call scenarios)
    clearPlaybackOnInterrupt?: boolean; // Clear audio queue on barge-in
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
    private ttsFallbackEnabled: boolean = false;
    private lastServerError: string | null = null;

    /**
     * Start a live session with Gemini
     */
    async connect(config: RealtimeAIConfig): Promise<void> {
        this.config = config;
        this.lastServerError = null;
        this.setState('connecting');

        const model = normalizeLiveModel(config.model);
        const apiKey = config.apiKey;
        let setupComplete = false;
        let isSettled = false;

        // WebSocket URL for Gemini Live API
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

        console.log(`${TAG} Connecting to Gemini Live API...`);
        console.log(`${TAG} Model: ${model}`);

        return new Promise((resolve, reject) => {
            try {
                const settleSuccess = () => {
                    if (isSettled) return;
                    isSettled = true;
                    resolve();
                };

                const settleError = (error: Error) => {
                    if (isSettled) return;
                    isSettled = true;
                    reject(error);
                };

                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log(`${TAG} WebSocket connected`);
                    this.sendSetupMessage(model, config);
                };

                this.ws.onmessage = async (event) => {
                    const message = await this.parseIncomingMessage(event?.data);
                    if (!message) return;

                    if (message?.setupComplete && !setupComplete) {
                        setupComplete = true;
                        this.startAudioCapture()
                            .then(() => {
                                this.setState('connected');
                                settleSuccess();
                            })
                            .catch((error: any) => {
                                const message = error?.message || 'Audio capture could not be started';
                                console.error(`${TAG} Session startup failed:`, message);
                                config.onError?.(message);
                                this.ws?.close();
                                settleError(new Error(message));
                            });
                    }

                    await this.handleMessage(message);
                };

                this.ws.onerror = (event: any) => {
                    const message = event?.message || 'WebSocket error';
                    console.error(`${TAG} WebSocket error:`, message);
                    config.onError?.(`Connection error: ${message}`);
                    settleError(new Error(message));
                };

                this.ws.onclose = (event) => {
                    console.log(`${TAG} WebSocket closed: ${event.code} ${event.reason}`);
                    this.setState('disconnected');
                    this.stopAudioCapture();

                    const reason =
                        this.lastServerError ||
                        event.reason?.trim() ||
                        `WebSocket closed (${event.code})`;
                    const closedBeforeSetup = !setupComplete;
                    const abnormalClose = event.code !== 1000;
                    if (closedBeforeSetup || abnormalClose) {
                        config.onError?.(reason);
                    }
                    if (closedBeforeSetup) {
                        settleError(new Error(reason));
                    }
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
                    // Native-audio Live models are strict; keep setup minimal.
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
            // Live API expects functionDeclarations (camelCase) for tool schemas.
            setupMessage.setup.tools = geminiTools.map((tool: any) => {
                if (tool?.functionDeclarations) return tool;
                if (tool?.function_declarations) {
                    return { functionDeclarations: tool.function_declarations };
                }
                return tool;
            });
        }

        this.sendMessage(setupMessage);
        console.log(`${TAG} Setup message sent`);
    }

    /**
     * Start capturing audio from microphone and sending to Gemini
     */
    private async startAudioCapture(): Promise<void> {
        if (!GeminiLiveAudio) {
            const reason = Platform.OS === 'android'
                ? 'GeminiLiveAudioModule bulunamadÄ±. Expo Go yerine development build kullanÄ±n.'
                : 'REALTIME_AI ÅŸu an yalnÄ±zca Android development build ile destekleniyor.';
            this.ttsFallbackEnabled = true;
            throw new Error(reason);
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
            this.ttsFallbackEnabled = false;
        } catch (error) {
            console.error(`${TAG} Audio capture error:`, error);
            this.ttsFallbackEnabled = true;
            throw error;
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
    private async handleMessage(message: any): Promise<void> {
        if (!message || typeof message !== 'object') return;

        // Setup complete acknowledgment
        if (message.setupComplete) {
            console.log(`${TAG} Setup complete, session ready`);
            return;
        }

        // Server-side explicit error payload
        if (message.error) {
            const errorMessage = this.extractErrorMessage(message.error);
            this.lastServerError = errorMessage;
            console.error(`${TAG} Server error:`, errorMessage);
            this.config?.onError?.(errorMessage);
            return;
        }

        // Server content (audio/text response)
        if (message.serverContent) {
            const content = message.serverContent;

            // Model turn - audio or text parts
            if (content.modelTurn?.parts) {
                for (const part of content.modelTurn.parts) {
                    // Audio response -> play it
                    if (part.inlineData?.data) {
                        await this.playAudioResponse(part.inlineData.data);
                    }
                    // Text response
                    if (part.text) {
                        console.log(`${TAG} Gemini text:`, part.text);
                        this.config?.onTranscript?.(part.text, false);
                        if (this.ttsFallbackEnabled) {
                            await this.speakTextFallback(part.text);
                        }
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
                if (GeminiLiveAudio && this.config?.clearPlaybackOnInterrupt !== false) {
                    await GeminiLiveAudio.clearPlaybackBuffer();
                }
            }
        }

        // Tool call from Gemini
        if (message.toolCall) {
            console.log(`${TAG} Tool call received:`, message.toolCall);
            await this.handleToolCall(message.toolCall);
        }
    }
    /**
     * Play audio response from Gemini
     */
    private async playAudioResponse(base64Data: string): Promise<void> {
        if (!GeminiLiveAudio) {
            this.ttsFallbackEnabled = true;
            return;
        }

        try {
            await GeminiLiveAudio.playAudioChunk(base64Data);
        } catch (error) {
            console.error(`${TAG} Playback error:`, error);
            this.ttsFallbackEnabled = true;
            this.config?.onError?.('Ses oynatma hatasÄ± oluÅŸtu. Metin tabanlÄ± seslendirme yedeÄŸine geÃ§ildi.');
        }
    }

    private async speakTextFallback(text: string): Promise<void> {
        const speakText = text?.trim();
        if (!speakText) return;

        try {
            await userSettingsService.ensureLoaded();
            const tts = userSettingsService.getTTSSettings();
            Speech.speak(speakText, {
                language: tts.language || 'tr-TR',
                rate: typeof tts.rate === 'number' ? tts.rate : 1.0,
                pitch: typeof tts.pitch === 'number' ? tts.pitch : 1.0,
            });
        } catch {
            Speech.speak(speakText, { language: 'tr-TR', rate: 1.0, pitch: 1.0 });
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
        Speech.stop();

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

    private extractErrorMessage(errorPayload: any): string {
        if (!errorPayload) return 'Live API error';
        if (typeof errorPayload === 'string') return errorPayload;
        const nestedMessage = errorPayload?.error?.message;
        const message = errorPayload?.message || nestedMessage || errorPayload?.status;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message.trim();
        }
        try {
            return JSON.stringify(errorPayload);
        } catch {
            return String(errorPayload);
        }
    }

    private async parseIncomingMessage(rawData: any): Promise<any | null> {
        const unwrap = async (value: any): Promise<any> => {
            if (value == null) return null;
            if (typeof value === 'string') return value;
            if (typeof value === 'object') {
                if (typeof value.data !== 'undefined' && value.data !== value) {
                    return unwrap(value.data);
                }
                if (typeof value.text === 'function') {
                    try {
                        return await value.text();
                    } catch {
                        // ignore blob text read failures
                    }
                }
                return value;
            }
            return String(value);
        };

        const normalized = await unwrap(rawData);
        if (normalized == null) return null;

        if (typeof normalized === 'string') {
            const text = normalized.trim();
            if (!text) return null;

            const looksLikeJson = text.startsWith('{') || text.startsWith('[');
            if (!looksLikeJson) {
                const compact = text.slice(0, 300);
                const looksLikeError = /(error|invalid|unsupported|denied|unauth|forbidden|not found|failed)/i.test(compact);
                if (looksLikeError) {
                    this.lastServerError = compact;
                    this.config?.onError?.(compact);
                    console.error(`${TAG} Non-JSON error frame:`, compact);
                } else {
                    console.log(`${TAG} Non-JSON frame ignored:`, compact);
                }
                return null;
            }

            try {
                return JSON.parse(text);
            } catch (error) {
                console.error(`${TAG} Message parse error:`, error);
                return null;
            }
        }

        if (typeof normalized === 'object') {
            return normalized;
        }
        return null;
    }

    private setState(state: SessionState): void {
        this.state = state;
        this.config?.onStateChange?.(state as any);
    }
}

// Singleton instance
export const geminiLiveService = new GeminiLiveService();

