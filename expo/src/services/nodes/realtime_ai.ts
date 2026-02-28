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
let activeRealtimeSessionOwner: string | null = null;
let activeRealtimeSessionStartedAt = 0;
const REALTIME_SESSION_STALE_MS = 5 * 60 * 1000;

export interface RealtimeAIConfig {
    systemPrompt?: string;
    voice?: string; // Gemini voice: 'Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede'
    model?: string;
    tools?: boolean; // Enable tool calling (default: true)
    retryWithoutTools?: boolean; // Retry setup without tools if first setup fails
    maxDuration?: number; // Max session duration in seconds (default: 300)
    maxTurns?: number; // Stop automatically after N transcript turns (0/undefined = unlimited)
    variableName?: string; // Store conversation transcript
    transcriptJsonVariable?: string; // Store raw transcript array
    includeTimestamps?: boolean; // Prefix saved transcript lines with [mm:ss]
    apiKey?: string;
    speakerMode?: boolean; // Route audio to loudspeaker (for phone call scenarios)
    clearPlaybackOnInterrupt?: boolean; // Clear buffered audio when user interrupts
}

export async function executeRealtimeAI(
    config: RealtimeAIConfig,
    variableManager: VariableManager,
    signal?: AbortSignal,
    toolExecutor?: (name: string, args: any) => Promise<any>
): Promise<any> {
    console.log(`${TAG} Starting real-time AI session`);

    // Auto-detect call context: if triggered from a phone call, force speaker mode
    const triggerType = variableManager.get('_triggerType');
    const isCallContext = triggerType === 'call';
    if (isCallContext && !config.speakerMode) {
        console.log(`${TAG} Call context detected, forcing speakerMode=true`);
        config.speakerMode = true;
    }

    const liveService = new GeminiLiveService();
    const transcript: { role: string; text: string; timestamp: number }[] = [];
    const maxDuration = (config.maxDuration || 300) * 1000; // Convert to ms
    const connectTimeoutMs = 25000; // Fail fast if setup never completes
    const maxTurns = Math.max(0, Number(config.maxTurns || 0));
    const includeTimestamps = config.includeTimestamps === true;
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

    const workflowId = String(variableManager.get('_workflowId') || 'unknown_workflow');
    if (activeRealtimeSessionOwner) {
        const lockAge = Date.now() - activeRealtimeSessionStartedAt;
        if (activeRealtimeSessionStartedAt > 0 && lockAge > REALTIME_SESSION_STALE_MS) {
            console.warn(
                `${TAG} Stale REALTIME_AI lock detected (owner=${activeRealtimeSessionOwner}, age=${lockAge}ms). Releasing lock.`
            );
            activeRealtimeSessionOwner = null;
            activeRealtimeSessionStartedAt = 0;
        }
    }
    if (activeRealtimeSessionOwner) {
        const message = `Another REALTIME_AI session is active (owner=${activeRealtimeSessionOwner}).`;
        console.warn(`${TAG} ${message}`);
        return {
            success: false,
            error: message,
            code: 'REALTIME_SESSION_BUSY',
        };
    }
    activeRealtimeSessionOwner = workflowId;
    activeRealtimeSessionStartedAt = Date.now();

    try {
        return await new Promise(async (resolve) => {
        let settled = false;
        let hasConnected = false;
        let connectAttemptInProgress = false;
        let stopRequestedByMaxTurns = false;
        let stopRequestedByMaxDuration = false;
        let stopRequestedByAbort = false;
        let runtimeError: string | null = null;

        const isGraceful1000Close = (value?: string | null) =>
            typeof value === 'string' && /websocket closed\s*\(1000\)/i.test(value);

        const resolveOnce = (result: any) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        const timeoutId = setTimeout(() => {
            stopRequestedByMaxDuration = true;
            console.log(`${TAG} Max duration reached, disconnecting`);
            liveService.disconnect();
        }, maxDuration);
        const connectTimeoutId = setTimeout(() => {
            if (!hasConnected) {
                runtimeError = 'Gemini Live setup timed out before session became ready';
                console.warn(`${TAG} ${runtimeError}`);
                liveService.disconnect();
            }
        }, connectTimeoutMs);

        if (signal) {
            signal.addEventListener('abort', () => {
                stopRequestedByAbort = true;
                console.log(`${TAG} Abort signal received`);
                clearTimeout(timeoutId);
                clearTimeout(connectTimeoutId);
                liveService.disconnect();
            });
        }

        const buildConnectConfig = (enableTools: boolean) => ({
            apiKey,
            model: config.model || 'gemini-2.5-flash-native-audio-preview-12-2025',
            systemInstruction: systemPrompt,
            voice: config.voice || 'Kore',
            tools: enableTools,
            speakerMode: config.speakerMode || false,
            clearPlaybackOnInterrupt: config.clearPlaybackOnInterrupt !== false,

            onTranscript: (text: string, isUser: boolean) => {
                transcript.push({
                    role: isUser ? 'user' : 'assistant',
                    text,
                    timestamp: Date.now() - startTime
                });

                if (!stopRequestedByMaxTurns && maxTurns > 0 && transcript.length >= maxTurns) {
                    stopRequestedByMaxTurns = true;
                    console.log(`${TAG} Max turns reached (${maxTurns}), disconnecting`);
                    liveService.disconnect();
                }
            },

            onToolCall: async (name: string, args: any) => {
                console.log(`${TAG} Tool call: ${name}`, args);
                if (toolExecutor) {
                    return await toolExecutor(name, args);
                }
                return { error: 'Tool executor not available' };
            },

            onError: (error: string) => {
                if (
                    isGraceful1000Close(error) &&
                    (stopRequestedByMaxDuration || stopRequestedByMaxTurns || stopRequestedByAbort)
                ) {
                    console.log(`${TAG} Ignoring graceful close error after intentional stop: ${error}`);
                    return;
                }
                runtimeError = error;
                console.error(`${TAG} Error:`, error);
            },

            onStateChange: (state: 'connecting' | 'connected' | 'disconnected') => {
                console.log(`${TAG} State: ${state}`);

                if (state === 'connected') {
                    hasConnected = true;
                    clearTimeout(connectTimeoutId);
                    return;
                }

                if (state !== 'disconnected') {
                    return;
                }

                if (!hasConnected) {
                    // Wait for connect() result to allow retry logic in the caller.
                    if (connectAttemptInProgress) return;
                    clearTimeout(timeoutId);
                    clearTimeout(connectTimeoutId);
                    resolveOnce({
                        success: false,
                        error: runtimeError || 'Live session disconnected before setup completed',
                    });
                    return;
                }

                clearTimeout(timeoutId);
                clearTimeout(connectTimeoutId);

                if (config.variableName) {
                    const transcriptText = transcript
                        .map(t => {
                            const speaker = t.role === 'user' ? 'Kullanici' : 'Asistan';
                            if (!includeTimestamps) {
                                return `${speaker}: ${t.text}`;
                            }
                            const totalSec = Math.max(0, Math.floor(t.timestamp / 1000));
                            const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
                            const ss = (totalSec % 60).toString().padStart(2, '0');
                            return `[${mm}:${ss}] ${speaker}: ${t.text}`;
                        })
                        .join('\n');
                    variableManager.set(config.variableName, transcriptText);
                }
                if (config.transcriptJsonVariable) {
                    variableManager.set(config.transcriptJsonVariable, transcript);
                }

                const duration = Date.now() - startTime;
                resolveOnce({
                    success: true,
                    duration,
                    turns: transcript.length,
                    transcript,
                    message: `Sesli oturum sona erdi (${Math.round(duration / 1000)}sn, ${transcript.length} mesaj)`
                });
            }
        });

        const connectWith = async (enableTools: boolean) => {
            connectAttemptInProgress = true;
            try {
                await liveService.connect(buildConnectConfig(enableTools));
            } finally {
                connectAttemptInProgress = false;
            }
        };

        try {
            const preferredTools = config.tools !== false;
            const allowRetryWithoutTools = config.retryWithoutTools !== false;
            try {
                await connectWith(preferredTools);
            } catch (error: any) {
                const message = String(error?.message || runtimeError || '');
                const invalidArgument = /invalid argument/i.test(message);
                if (preferredTools && allowRetryWithoutTools && invalidArgument) {
                    console.warn(`${TAG} Live setup rejected with tools enabled; retrying without tools.`);
                    runtimeError = null;
                    await connectWith(false);
                } else {
                    throw error;
                }
            }

            console.log(`${TAG} Session started, listening...`);

        } catch (error: any) {
            clearTimeout(timeoutId);
            clearTimeout(connectTimeoutId);
            console.error(`${TAG} Connection failed:`, error);

            const maybeError = runtimeError || error?.message || '';
            if (
                isGraceful1000Close(maybeError) &&
                (stopRequestedByMaxDuration || stopRequestedByMaxTurns || stopRequestedByAbort)
            ) {
                const duration = Date.now() - startTime;
                resolveOnce({
                    success: true,
                    duration,
                    turns: transcript.length,
                    transcript,
                    message: `Oturum kontrollu sekilde sonlandi (${Math.round(duration / 1000)}sn, ${transcript.length} mesaj)`
                });
                return;
            }

            resolveOnce({
                success: false,
                error: runtimeError || error.message || 'Gemini Live baglantisi kurulamadi',
            });
        }
        });
    } finally {
        if (activeRealtimeSessionOwner === workflowId) {
            activeRealtimeSessionOwner = null;
            activeRealtimeSessionStartedAt = 0;
        }
    }
}
