/**
 * InteractionService
 * Bridges the gap between Logic (WorkflowEngine) and UI (React Components)
 * Allows non-UI services to request user input (Text, Confirmation, etc.)
 */

export type InteractionType = 'input' | 'menu' | 'result' | 'confirm' | 'image' | 'udf' | 'whatsapp' | 'web_automation' | 'speech';

export interface InteractionRequest {
    type: InteractionType;
    title: string;
    description?: string;
    // Input specific
    placeholder?: string;
    defaultValue?: string;
    // Menu specific
    options?: string[];
    // Result specific
    content?: any;
}

type InteractionHandler = (request: InteractionRequest) => Promise<any>;

class InteractionService {
    private handler: InteractionHandler | null = null;

    registerHandler(handler: InteractionHandler) {
        this.handler = handler;
    }

    unregisterHandler() {
        this.handler = null;
    }

    async requestInput(prompt: string, placeholder?: string, defaultValue?: string): Promise<any> {
        if (!this.handler) return defaultValue || null;
        return this.handler({
            type: 'input',
            title: prompt,
            placeholder,
            defaultValue
        });
    }

    async requestSpeech(prompt: string, language?: string): Promise<string | null> {
        if (!this.handler) return null;
        return this.handler({
            type: 'speech',
            title: prompt,
            description: language || 'tr-TR'
        });
    }

    async showMenu(title: string, options: string[]): Promise<string | null> {
        if (!this.handler) return null;
        return this.handler({
            type: 'menu',
            title,
            options
        });
    }

    async showResult(title: string, content: any): Promise<any> {
        if (!this.handler) return;
        return this.handler({
            type: 'result',
            title,
            content
        });
    }
    async showImage(title: string, uri: string): Promise<any> {
        if (!this.handler) return false;
        return this.handler({
            type: 'image',
            title,
            content: uri
        });
    }

    async showUdf(title: string, uri: string): Promise<void> {
        if (!this.handler) return;
        return this.handler({
            type: 'udf',
            title,
            content: uri
        });
    }

    async showPdf(title: string, uri: string): Promise<void> {
        if (!this.handler) return;
        return this.handler({
            type: 'udf', // Reuse UDF/Document viewer type for now, but handle internally
            title,
            description: 'pdf', // Flag as PDF
            content: uri
        });
    }

    async showText(title: string, content: string): Promise<void> {
        if (!this.handler) return;
        return this.handler({
            type: 'result', // Using 'result' for text display for now, can be 'text' if needed
            title,
            content
        });
    }

    async requestWhatsApp(phoneNumber: string, message: string, mediaPath?: string): Promise<any> {
        if (!this.handler) return;
        return this.handler({
            type: 'whatsapp',
            title: 'WhatsApp Gönderiliyor',
            description: 'Otomasyon başlatılıyor...',
            content: { phoneNumber, message, mediaPath }
        });
    }

    async requestWebAutomation(config: any): Promise<any> {
        if (!this.handler) return;
        return this.handler({
            type: 'web_automation',
            title: 'Web Otomasyonu',
            description: 'Web sitesi üzerinde işlemler yapılıyor...',
            content: config
        });
    }
}

export const interactionService = new InteractionService();
