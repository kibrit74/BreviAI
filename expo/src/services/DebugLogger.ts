import { create } from 'zustand';

export type LogType = 'info' | 'error' | 'network' | 'ai' | 'execution' | 'native' | 'workflow' | 'warning' | 'notification';

export interface LogEntry {
    id: string;
    timestamp: number;
    type: LogType;
    title: string;
    details: any;
    stackTrace?: string;
}

interface DebugState {
    logs: LogEntry[];
    addLog: (type: LogType, title: string, details: any, stackTrace?: string) => void;
    clearLogs: () => void;
    isVisible: boolean;
    toggleVisibility: () => void;
    filter: LogType | 'all';
    setFilter: (filter: LogType | 'all') => void;
}

export const useDebugStore = create<DebugState>((set) => ({
    logs: [],
    isVisible: false,
    filter: 'all',
    addLog: (type, title, details, stackTrace) => set((state) => ({
        logs: [{
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            type,
            title,
            details: typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details),
            stackTrace
        }, ...state.logs].slice(0, 1000) // Keep last 1000 logs
    })),
    clearLogs: () => set({ logs: [] }),
    toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
    setFilter: (filter) => set({ filter })
}));

export const debugLog = (type: LogType, title: string, details: any = '', error?: any) => {
    let stackTrace = undefined;
    if (error instanceof Error) {
        stackTrace = error.stack;
    }

    // Console log for development
    const prefix = `[${type.toUpperCase()}]`;
    if (type === 'error') {
        console.error(prefix, title, details, error);
    } else if (type === 'warning') {
        console.warn(prefix, title, details);
    } else {
        console.log(prefix, title, details);
    }

    useDebugStore.getState().addLog(type, title, details, stackTrace);
};
