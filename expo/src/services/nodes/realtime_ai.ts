/**
 * REALTIME_AI Node Executor
 * 
 * Real-time voice AI using Gemini Live API.
 * Single node replaces entire STT → AI → TTS workflow.
 */

import { VariableManager } from '../VariableManager';
import { GeminiLiveService } from '../GeminiLiveService';
import { userSettingsService } from '../UserSettingsService';
import { interactionService } from '../InteractionService';

const TAG = '[REALTIME_AI]';

export interface RealtimeAIConfig {
    systemPrompt?: string;
    voice?: string; // Gemini voice: 'Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede'
    model?: string;
    tools?: boolean; // Enable tool calling (default: true)
    maxDuration?: number; // Max session duration in seconds (default: 300)
    variableName?: string; // Store conversation transcript
    apiKey?: string;
    speakerMode?: boolean; // Route audio to loudspeaker (for phone call scenarios)
}

export async function executeRealtimeAI(
    config: RealtimeAIConfig,
    variableManager: VariableManager,
    signal?: AbortSignal,
    toolExecutor?: (name: string, args: any) => Promise<any>
): Promise<any> {
    console.log(`${TAG} Starting real-time AI session`);

    const liveService = new GeminiLiveService();
    const transcript: { role: string; text: string; timestamp: number }[] = [];
    const maxDuration = (config.maxDuration || 300) * 1000; // Convert to ms
    const startTime = Date.now();

    // Get API key
    let apiKey = config.apiKey;
    if (!apiKey) {
        try {
            const settings = await userSettingsService.getSettings();
            apiKey = settings.geminiApiKey;
        } catch (e) {
            // fallback
        }
    }

    if (!apiKey) {
        return {
            success: false,
            error: 'Gemini API anahtarı bulunamadı. Ayarlar > API Anahtarları bölümünden ekleyin.'
        };
    }

    // Resolve system prompt variables
    const systemPrompt = config.systemPrompt
        ? variableManager.resolveString(config.systemPrompt)
        : 'Sen BreviAI sesli asistanısın. Kullanıcıyla Türkçe konuşuyorsun. Kısa ve doğal cevaplar ver.';

    return new Promise(async (resolve) => {
        // Timeout handler
        const timeoutId = setTimeout(() => {
            console.log(`${TAG} Max duration reached, disconnecting`);
            liveService.disconnect();
        }, maxDuration);

        // Abort signal handler
        if (signal) {
            signal.addEventListener('abort', () => {
                console.log(`${TAG} Abort signal received`);
                clearTimeout(timeoutId);
                liveService.disconnect();
            });
        }

        try {
            await liveService.connect({
                apiKey,
                model: config.model || 'gemini-2.0-flash-live-001',
                systemInstruction: systemPrompt,
                voice: config.voice || 'Kore',
                tools: config.tools !== false, // Default true
                speakerMode: config.speakerMode || false,

                onTranscript: (text: string, isUser: boolean) => {
                    transcript.push({
                        role: isUser ? 'user' : 'assistant',
                        text,
                        timestamp: Date.now() - startTime
                    });
                },

                onToolCall: async (name: string, args: any) => {
                    console.log(`${TAG} Tool call: ${name}`, args);
                    if (toolExecutor) {
                        return await toolExecutor(name, args);
                    }
                    return { error: 'Tool executor not available' };
                },

                onError: (error: string) => {
                    console.error(`${TAG} Error:`, error);
                },

                onStateChange: (state) => {
                    console.log(`${TAG} State: ${state}`);

                    if (state === 'disconnected') {
                        clearTimeout(timeoutId);

                        // Store transcript
                        if (config.variableName) {
                            const transcriptText = transcript
                                .map(t => `${t.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${t.text}`)
                                .join('\n');
                            variableManager.set(config.variableName, transcriptText);
                        }

                        const duration = Date.now() - startTime;
                        resolve({
                            success: true,
                            duration,
                            turns: transcript.length,
                            transcript,
                            message: `Sesli oturum sona erdi (${Math.round(duration / 1000)}sn, ${transcript.length} mesaj)`
                        });
                    }
                }
            });

            console.log(`${TAG} Session started, listening...`);

        } catch (error: any) {
            clearTimeout(timeoutId);
            console.error(`${TAG} Connection failed:`, error);
            resolve({
                success: false,
                error: error.message || 'Gemini Live bağlantısı kurulamadı',
            });
        }
    });
}
