// @ts-ignore
import CallDetectorManager from 'react-native-call-detection';
import { VariableManager } from './VariableManager';

// Simple EventEmitter implementation to avoid package issues
class SimpleEventEmitter {
    private events: Record<string, Function[]> = {};

    on(event: string, listener: Function) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
        return this;
    }

    emit(event: string, ...args: any[]) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
        return true;
    }

    off(event: string, listener: Function) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
        return this;
    }
}

// Singleton for handling call events
class CallTriggerService extends SimpleEventEmitter {
    private callDetector: any = null;
    private isListening = false;
    private lastState: string = '';

    startListening() {
        if (this.isListening) return;

        try {
            console.log('[CallTrigger] Starting listener...');

            // Initialize CallDetector
            this.callDetector = new CallDetectorManager(
                (event: string, phoneNumber: string) => {
                    console.log(`[CallTrigger] Event: ${event}, Number: ${phoneNumber}`);

                    // Normalize event names to match our config
                    // Library returns: Incoming, Connected, Disconnected, Dialing, Offhook
                    let state = event;

                    // Simple debounce
                    if (this.lastState === state) return;
                    this.lastState = state;

                    // Emit event for workflow engine to pick up
                    this.emit('call_state_change', {
                        state: state, // 'Incoming', 'Connected', 'Disconnected'
                        phoneNumber: phoneNumber
                    });
                },
                true, // readPhoneNumber (Requires READ_PHONE_STATE & READ_CALL_LOG)
                () => {
                    console.log('[CallTrigger] Permission Denied or Error');
                },
                {
                    title: 'Telefon İzni',
                    message: 'Otomasyonların aramaları algılayabilmesi için telefon izni gereklidir.',
                    buttonPositive: 'Tamam',
                    buttonNegative: 'İptal'
                }
            );

            this.isListening = true;
            console.log('[CallTrigger] Started successfully');

        } catch (error) {
            console.error('[CallTrigger] Failed to start:', error);
        }
    }

    stopListening() {
        if (this.callDetector) {
            this.callDetector.dispose();
            this.callDetector = null;
        }
        this.isListening = false;
        console.log('[CallTrigger] Stopped');
    }
}

export const callTriggerService = new CallTriggerService();
