import { GoogleGenerativeAI, GenerativeModel, SchemaType } from '@google/generative-ai';

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model instances
let flash25Model: GenerativeModel | null = null;
let flash30Model: GenerativeModel | null = null;

/**
 * Get Gemini 2.5 Flash model (using 2.0 flash)
 */
export function getFlash25Model(): GenerativeModel {
    // Return cached instance only if env hasn't changed (simplified)
    if (!flash25Model) {
        flash25Model = genAI.getGenerativeModel({
            model: 'gemini-2.5-pro',
            generationConfig: {
                temperature: 0.4,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 7000,
                responseMimeType: 'application/json',
            },
        });
    }
    return flash25Model;
}

/**
 * Get Gemini 3.0 Flash model
 */
export function getFlash30Model(): GenerativeModel {
    if (!flash30Model) {
        flash30Model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: {
                temperature: 0.4,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
            },
        });
    }
    return flash30Model;
}

let proModel: GenerativeModel | null = null;

/**
 * Get Gemini 2.5 Pro model with Web Search (Grounding)
 */
export function getProModel(): GenerativeModel {
    if (!proModel) {
        proModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-pro',
            tools: [{ googleSearch: {} } as any], // Enable Grounding
            generationConfig: {
                temperature: 0.4,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 7000,
                // responseMimeType: 'application/json', // Invalid with Tools
            },
        });
    }
    return proModel;
}

let searchModel: GenerativeModel | null = null;

/**
 * Get Gemini model optimized for web search with Google Search grounding
 * Returns real-time information from the web with citations
 */
export function getSearchModel(): GenerativeModel {
    if (!searchModel) {
        searchModel = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            tools: [
                {
                    googleSearch: {}
                } as any
            ],
            generationConfig: {
                temperature: 0.3, // Lower temp for factual accuracy
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 4096,
            },
        });
    }
    return searchModel;
}

/**
 * Perform a grounded web search using Gemini
 * Returns response with grounding metadata and citations
 */
export async function groundedSearch(query: string): Promise<{
    answer: string;
    sources: Array<{ title: string; url: string }>;
}> {
    const model = getSearchModel();

    const result = await model.generateContent([
        { text: `Güncel bilgilerle şu soruyu yanıtla: ${query}` }
    ]);

    const response = result.response;
    const answer = response.text();

    // Extract grounding sources if available
    const sources: Array<{ title: string; url: string }> = [];
    const groundingMetadata = (response as any).candidates?.[0]?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web) {
                sources.push({
                    title: chunk.web.title || 'Kaynak',
                    url: chunk.web.uri || ''
                });
            }
        }
    }

    return { answer, sources };
}

/**
 * Generate content with the specified model
 */
export async function generateContent(
    model: GenerativeModel,
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    const chat = model.startChat({
        history: [
            {
                role: 'user',
                parts: [{ text: systemPrompt }],
            },
            {
                role: 'model',
                parts: [{ text: 'Anlaşıldı. İsteğinizi analiz edip kütüphanemdeki en uygun Node\'ları seçerek eksiksiz ve doğru bir Workflow oluşturacağım.' }],
            },
        ],
    });

    const result = await chat.sendMessage(userPrompt);
    const response = await result.response;
    return response.text();
}

/**
 * Batch generate content (for cost optimization)
 */
export async function batchGenerateContent(
    prompts: string[],
    systemPrompt: string
): Promise<string[]> {
    const model = getFlash25Model(); // Use cheaper model for batch
    const results: string[] = [];

    // Process in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map((prompt) => generateContent(model, systemPrompt, prompt))
        );
        results.push(...batchResults);

        // Small delay to avoid rate limiting
        if (i + batchSize < prompts.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    return results;
}

/**
 * Transcribe audio using Gemini 2.5 Flash
 */
export async function transcribeAudio(
    audioBase64: string,
    mimeType: string = 'audio/mp3'
): Promise<string> {
    // We create a fresh model instance for transcription to avoid 'application/json' constraint
    // Using Gemini 2.5 Flash as explicitly requested
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
    });

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType,
                data: audioBase64
            }
        },
        { text: "Transcribe this audio exactly as spoken. Do not add any description. Return only the text." }
    ]);

    return result.response.text();
}
