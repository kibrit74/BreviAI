import { AgentAIConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
// Fix for SDK 54 deprecation
// import * as FileSystem from 'expo-file-system';
let FileSystem: any;
try {
    FileSystem = require('expo-file-system/legacy');
} catch (e) {
    // Fallback if legacy not available (older SDKs)
    FileSystem = require('expo-file-system');
}
import { userSettingsService } from '../UserSettingsService';
import { getGeminiTools, getOpenAITools, getClaudeTools } from '../ToolRegistry';
import { AgentMemoryService } from '../AgentMemoryService';

// Memory Helper
async function loadMemory(memoryKey: string): Promise<any[]> {
    try {
        const memoryDir = (FileSystem.documentDirectory || '') + 'brain/memory/';
        const memoryPath = memoryDir + memoryKey + '.json';
        const fileInfo = await FileSystem.getInfoAsync(memoryPath);

        if (fileInfo.exists) {
            const content = await FileSystem.readAsStringAsync(memoryPath);
            const history = JSON.parse(content);
            console.log(`[AI_AGENT] Memory loaded for key '${memoryKey}': ${history.length} items`);
            return history;
        }
    } catch (e) {
        console.warn(`[AI_AGENT] Failed to load memory for '${memoryKey}':`, e);
    }
    return [];
}

// ReAct Configuration
const AGENT_CONFIG = {
    maxIterations: 25, // Increased from 10 to allow complex loops (e.g. processing multiple rows)
    totalTimeout: 120000 // 2 minutes timeout
};

export type ToolExecutorCallback = (toolName: string, args: any) => Promise<any>;

export async function executeAgentAI(
    config: AgentAIConfig,
    variableManager: VariableManager,
    signal?: AbortSignal,
    toolExecutor?: ToolExecutorCallback
): Promise<any> {
    const startTime = Date.now();

    // VALIDATION: Prompt must exist
    if (!config.prompt || config.prompt.trim() === '') {
        return {
            success: false,
            error: 'Prompt alanı boş olamaz. Lütfen bir komut girin.'
        };
    }

    console.log('[AI_AGENT] Starting ReAct Loop', {
        provider: config.provider,
        hasToolExecutor: !!toolExecutor
    });

    // 0. Resolve Variables in Prompt
    // CRITICAL: The prompt might contain {{variables}} like {{sheetData}}.
    // We must resolve them BEFORE sending to Gemini.
    let currentPrompt = variableManager.resolveString(config.prompt || "");

    // 1. Inject Context (if applicable)
    if (hasContext(currentPrompt)) {
        currentPrompt = await injectContext(currentPrompt);
    }

    // Get API Key
    const apiKey = await getApiKey(config);
    if (!apiKey) return { success: false, error: 'API Key missing' };


    // 2. Resolve Attachments
    const attachmentResult = await resolveAttachments(config, variableManager);
    const attachments = attachmentResult.parts;

    // Inject metadata into prompt so Agent knows file paths (crucial for tools)
    if (attachmentResult.metadata) {
        currentPrompt += `\n\n[SYSTEM INFO] The user has attached the following files. Use these URIs for tools like 'read_file' or 'view_document':\n${attachmentResult.metadata}`;
        console.log('[AI_AGENT] Injected attachment metadata into prompt');
    }

    // 3. Build Session History
    const sessionHistory: any[] = [];

    // Load Persistent Memory (if key provided)
    if (config.memoryKey) {
        const previousHistory = await loadMemory(config.memoryKey);
        if (previousHistory && previousHistory.length > 0) {
            // Add memory marker
            sessionHistory.push({
                role: 'model',
                parts: [{ text: `[SYSTEM] I recall our previous conversation (Memory Key: ${config.memoryKey}). I will use this context to answer better.` }]
            });

            // Inject previous turns
            // Google Gemini expects alternating user/model roles. 
            // Our stored format is simple {role, content}. We need to map it back to parts.
            previousHistory.forEach(turn => {
                sessionHistory.push({
                    role: turn.role,
                    parts: [{ text: turn.content }]
                });
            });

            console.log(`[AI_AGENT] Injected ${previousHistory.length} turns from memory.`);
        }
    }

    // Add SYSTEM INSTRUCTION (if tools enabled)
    if (toolExecutor) {
        sessionHistory.push({
            role: 'user',
            parts: [{
                text: `[SYSTEM] 📅 GÜNCEL TARİH/SAAT: ${new Date().toLocaleString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

${AgentMemoryService.generateUserContext()}

🤖 **SEN KİMSİN?**
Sen BreviAI'ın güçlü AI asistanısın. ${AgentMemoryService.getGreeting()} Kullanıcının telefon otomasyonlarını yönetmesine, bilgi aramasına ve cihaz kontrolü yapmasına yardım ediyorsun. Sana verilen ARAÇLARI (tools) kullanarak gerçek işlemler yapabilirsin.

═══════════════════════════════════════════════════════════════
📋 TEMEL KURALLAR
═══════════════════════════════════════════════════════════════

1. **ASLA BİLGİ UYDURMA** → Bilmediğin konularda 'search_web' kullan
2. **EYLEM ODAKLI OL** → "Yapacağım" deme, YAPA! Araçları hemen çağır
3. **ARAÇLARA GÜVEN** → Kendi bilgine değil, araç sonuçlarına güven
4. **SORU SOR** → Eksik bilgi varsa 'ask_user' ile kullanıcıya sor
5. **RESİM/PDF ANALİZİ** → Kullanıcı sana resim veya PDF eklediğinde DOĞRUDAN ANALİZ ET!
   - Sen Gemini Vision modeline sahipsin, eklenen dosyaları görebilirsin
   - Resimlerden metin çıkarabilirsin (OCR), nesneleri tanıyabilirsin
   - PDF içeriğini okuyup analiz edebilirsin
   - Ekstra araç çağırmana GEREK YOK - sadece görüntüye bak ve analiz et!

═══════════════════════════════════════════════════════════════
🔄 OTOMASYON OLUŞTURMA (ÇOK ÖNEMLİ!)
═══════════════════════════════════════════════════════════════

Kullanıcı şu kalıplardan birini kullanırsa **OTOMASYON** istiyor demektir:
- "...gelince", "...olunca", "...ise", "...zaman"
- "Her ...", "...dığında/diğinde"
- "Eğer ... ise ... yap"

**OTOMASYON OLUŞTURMA ADIMLARMI:**

1️⃣ **TETİKLEYİCİYİ BELİRLE** (Ne zaman çalışacak?)
   - Zaman bazlı → 'trigger_time'
   - Bildirim gelince → 'trigger_notification' 
   - SMS gelince → 'trigger_sms'
   - Arama gelince → 'trigger_call'
   - WhatsApp mesajı → 'trigger_whatsapp'
   - Telefon sallanınca → 'trigger_gesture'
   - Konuma girilince → 'trigger_geofence_enter'
   - Konumdan çıkılınca → 'trigger_geofence_exit'

2️⃣ **EYLEMİ BELİRLE** (Ne yapılacak?)
   - Fener aç/kapa → 'toggle_flashlight'
   - Sessize al → 'set_sound_mode'
   - Mesaj gönder → 'send_sms' veya 'send_whatsapp'
   - Konum al → 'get_location'
   - Bildirim gönder → 'send_notification'
   - Ses modunu değiştir → 'set_dnd'
   - vb...

3️⃣ **SIRASYLA ÇAĞIR**
   Önce trigger, sonra action araçlarını çağır.

**ÖRNEKLER:**

| Kullanıcı Dedi | Trigger | Action |
|----------------|---------|--------|
| "Telefonu sallayınca feneri aç" | trigger_gesture(shake) | toggle_flashlight(on) |
| "Her sabah 8'de hava durumunu söyle" | trigger_time(8:00) | search_web + speak_text |
| "SMS gelince bildir" | trigger_sms() | send_notification |
| "Eve gelince wifi aç" | trigger_geofence_enter | open_settings(wifi) |
| "Biri aradığında DND aç" | trigger_call | set_dnd(true) |
| "WhatsApp'ta acil yazarsa alarm çal" | trigger_whatsapp(messageFilter:"acil") | send_notification |

═══════════════════════════════════════════════════════════════
🔔 TETİKLEYİCİ DEĞİŞKENLERİ
═══════════════════════════════════════════════════════════════

Trigger çalıştığında otomatik değişkenler oluşur:

| Trigger | Kullanılabilir Değişkenler |
|---------|----------------------------|
| SMS | {{_smsSender}}, {{_smsMessage}} |
| CALL | {{_callerInfo.number}}, {{_callerInfo.state}} |
| WHATSAPP | {{_whatsappSender}}, {{_whatsappMessage}} |
| NOTIFICATION | {{_notificationTitle}}, {{_notificationText}} |
| EMAIL | {{_emailSender}}, {{_emailSubject}} |
| TELEGRAM | {{_telegramChatName}}, {{_telegramMessage}} |
| GEOFENCE | {{_geofenceId}}, {{_geofenceAction}} |

⚠️ **DİKKAT:** WhatsApp/Bildirimden gelen "gönderen" isimdir, numara DEĞİL!
Yanıt göndermek için ya sabit numara iste ya da 'search_contacts' ile bul.

═══════════════════════════════════════════════════════════════
🛠️ ARAÇ KATEGORİLERİ
═══════════════════════════════════════════════════════════════

**📱 CİHAZ KONTROLÜ:**
toggle_flashlight, set_brightness, set_volume, set_dnd, set_sound_mode, wake_screen, control_media, set_bluetooth

**📅 TAKVİM:**
read_calendar, create_event, update_event, delete_event

**👥 KİŞİLER:**
search_contacts, create_contact

**📧 İLETİŞİM:**
send_email, search_emails, send_sms, send_whatsapp, send_telegram, send_slack, send_discord

**🏢 MICROSOFT OFFICE:**
send_outlook, read_outlook, read_excel, write_excel, upload_to_onedrive, download_from_onedrive, list_onedrive_files

**📊 GOOGLE WORKSPACE:**
read_sheet, write_sheet, upload_drive, limit_drive_files

**📝 NOTION:**
create_notion, read_notion

**🌐 WEB:**
search_web, http_request, open_url, read_rss, web_automation

**📍 KONUM:**
get_location, navigate, create_geofence

**🌤️ HAVA DURUMU:**
get_weather

**🔔 BİLDİRİM:**
send_notification, speak_text, show_text, show_image

**📁 DOSYA & BELGE:**
read_file, write_file, pick_file, create_pdf, view_document

**🧠 HAFIZA (MEMORY):**
remember_info, search_memory, add_to_memory, bulk_add_to_memory, clear_memory

**📱 SOSYAL MEDYA:**
login_facebook, post_instagram

**🖼️ GÖRSEL & KAMERA:**
take_photo, generate_image, edit_image

**🗣️ SES & ÇEVİRİ:**
record_audio, listen_speech, translate_text

**🔄 MANTIK:**
control_loop, control_if_else, control_switch, wait

═══════════════════════════════════════════════════════════════
💡 AKILLI DAVRANIŞLAR
═══════════════════════════════════════════════════════════════

1. **Fiyat/Haber Sorularında:** Önce 'search_web' çağır, sonra özetle
2. **Takvim Sorularında:** Önce 'read_calendar' ile kontrol et
3. **Kişi Sorularında:** 'search_contacts' ile ara
4. **Konum Gerektiren İşlemlerde:** Önce 'get_location' çağır
5. **Belirsiz İsteklerde:** 'ask_user' ile netleştir

${config.variableName ? `
═══════════════════════════════════════════════════════════════
💾 ÇIKTI FORMATI (ÖNEMLİ)
═══════════════════════════════════════════════════════════════
Kullanıcı senden bir DEĞER istiyor ('${config.variableName}').
1. Sonucu Kesinlikle JSON formatında ver.
2. Ekrana bir şey yazdırmak için 'show_text' KULLANMA. Kullanıcı sonucu arayüzde değil, otomasyon içinde kullanacak.
3. Sadece hesapla/bul ve JSON olarak döndür.` : ''}

Şimdi kullanıcının isteğini dinle ve ARAÇLARI KULLAN!` }]
        });
        sessionHistory.push({
            role: 'model',
            parts: [{ text: `Anladım. Araçları kullanacağım ve asla bilgi uydurmayacağım. Eğer veriyi bulamazsam kullanıcıya soracağım. ${config.variableName ? 'Sonucu JSON formatında döndüreceğim.' : 'Ne yapmamı istersin?'}` }]
        });
    }

    // Add User Prompt
    // MOVED: The strict JSON enforcement logic is now handled in the System Prompt logic above
    // based on whether it is an Action or Extraction task. We do NOT blindly appending "IGNORE INSTRUCTIONS" anymore.
    let finalUserPrompt = currentPrompt;
    // if (config.variableName) { ... REMOVED ... }

    sessionHistory.push({
        role: 'user',
        parts: buildParts(finalUserPrompt, attachments)
    });

    // 4. ReAct Loop
    const MAX_LOOPS = 15;
    let loopCount = 0;
    let finalResponse = ""; // Keep finalResponse here as it's used later
    let toolCallsCount = 0;
    const totalTimeout = 300000; // 5 minutes strict timeout
    const TOTAL_TIMEOUT_MS = 300000;
    const startTimeResult = Date.now();
    let activeModel = config.model;

    while (loopCount < MAX_LOOPS) {
        if (Date.now() - startTimeResult > TOTAL_TIMEOUT_MS) {
            console.warn('[AI_AGENT] Execution timed out.');
            // Save what we have so far
            if (config.variableName) {
                variableManager.set(config.variableName, "Timed out.");
            }
            return { success: false, error: 'Agent execution timed out (Total limit).' };
        }
        if (signal?.aborted) {
            return { success: false, error: 'Execution aborted.' };
        }

        loopCount++; // Use loopCount for iteration
        console.log(`[AI_AGENT] Iteration ${loopCount}/${MAX_LOOPS}`);

        try {
            // CALL API
            // Route to correct provider based on config
            const shouldForceJson = config.outputFormat === 'json';
            const provider = config.provider || 'gemini';

            let apiResult: any;

            try {
                console.log(`[AI_AGENT] Using provider: ${provider}`);

                if (provider === 'openai') {
                    apiResult = await callOpenAIReAct(
                        apiKey,
                        config.model || 'gpt-4o',
                        sessionHistory,
                        config.temperature || 0.7,
                        !!toolExecutor
                    );
                } else if (provider === 'claude') {
                    apiResult = await callClaudeReAct(
                        apiKey,
                        config.model || 'claude-3-5-sonnet-20241022',
                        sessionHistory,
                        config.temperature || 0.7,
                        !!toolExecutor
                    );
                } else {
                    // Default: Gemini
                    apiResult = await callGeminiReAct(
                        apiKey,
                        activeModel || 'gemini-2.5-pro',
                        sessionHistory,
                        config.temperature || 0.7,
                        !!toolExecutor,
                        shouldForceJson
                    );
                    if (apiResult?.usedModel) activeModel = apiResult.usedModel;
                }

            } catch (err: any) {
                // ERROR HANDLING STRATEGY:
                // If Gemini fails to respond (empty candidates) but we have ALREADY performed a significant action
                // (like show_text, send_email, etc.) in the immediate previous turn, assume the task is finished
                // and treat this as a "Silent Stop".
                const errorMessage = err?.message || '';
                const isNoResponseError = errorMessage.includes('No response') || errorMessage.includes('Empty candidates');

                if (isNoResponseError) {
                    // Check execution history to see if we just finished a terminal task
                    const lastHistoryItem = sessionHistory[sessionHistory.length - 1];
                    const secondLastItem = sessionHistory[sessionHistory.length - 2];

                    // 1. Check if the very last item was a Tool Response (User/Function role)
                    const lastToolResponseName = lastHistoryItem?.parts?.find((p: any) => p.functionResponse)?.functionResponse?.name;

                    // 2. Check if the item before that was the Tool Call (Model role)
                    const lastToolCallName = secondLastItem?.parts?.find((p: any) => p.functionCall)?.functionCall?.name;

                    // List of tools that imply "Task might be done"
                    const TERMINAL_TOOLS = ['show_text', 'send_email', 'create_event', 'show_image', 'ask_user'];
                    const relevantTool = lastToolResponseName || lastToolCallName;

                    if (relevantTool && TERMINAL_TOOLS.includes(relevantTool)) {
                        console.log(`[AI_AGENT] 'No Response' error occurred after terminal tool '${relevantTool}'. Treating as Success/Stop.`);

                        // Construct a fake "Success" response
                        apiResult = {
                            text: "İşlem tamamlandı.", // Generic fallback text
                            functionCalls: [],
                            historyItem: { role: 'model', parts: [{ text: "İşlem tamamlandı." }] }
                        };
                        break; // Exit loop
                    }
                }

                // If not a safe exit condition, re-throw
                throw err;
            }

            // Add Model Response to History
            // apiResult.rawResponse is the full candidate part structure
            sessionHistory.push(apiResult.historyItem);

            // CHECK ACTIONS
            if (apiResult.functionCalls && apiResult.functionCalls.length > 0) {
                if (!toolExecutor) {
                    throw new Error("Agent tried to call function but no executor provided.");
                }

                toolCallsCount += apiResult.functionCalls.length;
                console.log('[AI_AGENT] Tool Calls:', apiResult.functionCalls.map(c => c.name));

                // Notify User (Simulated Streaming)
                // In a real app we would emit an event here: "Checking calendar..."

                // EXECUTE TOOLS (Parallel)
                const toolPromises = apiResult.functionCalls.map(async (call) => {
                    try {
                        console.log(`[AI_AGENT] Executing ${call.name} with`, call.args);
                        const result = await toolExecutor(call.name, call.args);

                        // Log successful action to memory
                        if (call.name !== 'ask_user') {
                            AgentMemoryService.logAction({
                                action: `Executed ${call.name}`,
                                toolName: call.name,
                                params: call.args,
                                success: true
                            }).catch(e => console.warn('Memory log failed', e));
                        }

                        return {
                            name: call.name,
                            response: { result: result } // Wrapper object
                        };
                    } catch (err: any) {
                        console.error(`[AI_AGENT] Tool ${call.name} Failed:`, err);
                        return {
                            name: call.name,
                            response: { error: err.message || "Tool execution failed" }
                        };
                    }
                });

                const toolResults = await Promise.all(toolPromises);

                // CRITICAL FIX: Extract attachments from ask_user results and add as inline_data
                // This allows Gemini Vision to actually SEE attached images
                let inlineDataParts: any[] = [];
                for (const tr of toolResults) {
                    if (tr.name === 'ask_user' && tr.response?.result) {
                        const askResult = tr.response.result;
                        console.log('[AI_AGENT] ask_user result type:', typeof askResult, askResult);
                        // Check if result has attachments (from InteractionModal)
                        if (askResult && typeof askResult === 'object' && askResult.attachments && Array.isArray(askResult.attachments)) {
                            console.log('[AI_AGENT] Found attachments in ask_user result:', askResult.attachments.length, askResult.attachments);
                            const processedImages = await processAttachments(askResult.attachments);
                            console.log('[AI_AGENT] Processed images:', processedImages.length);
                            for (const img of processedImages) {
                                if (isGeminiSupportedMime(img.mimeType)) {
                                    inlineDataParts.push({
                                        inline_data: {
                                            mime_type: img.mimeType,
                                            data: img.base64
                                        }
                                    });
                                    console.log('[AI_AGENT] Added inline_data for:', img.mimeType, 'base64 length:', img.base64?.length);
                                }
                            }
                            // Update response to include text but indicate attachments are inline
                            tr.response.result = {
                                text: askResult.text || '',
                                attachments_info: `[${askResult.attachments.length} file(s) attached - I can see them in the image data]`
                            };
                        }
                    }
                }

                // Create Function Response Parts for Gemini
                const functionResponseParts = toolResults.map(res => ({
                    functionResponse: {
                        name: res.name,
                        response: res.response
                    }
                }));

                // Feed back to History - include inline_data BEFORE function responses
                // CRITICAL FIX: Gemini expects 'user' role for function responses
                sessionHistory.push({
                    role: 'user',
                    parts: [...inlineDataParts, ...functionResponseParts]
                });

                // Loop continues to next iteration to let Gemini process the tool results

            } else {
                // TEXT RESPONSE
                let textResponse = apiResult.text || "";

                // UNWRAP JSON IF NEEDED
                // The model might return JSON even if we didn't force it, or because we forced it in previous turns.
                let cleanText = textResponse;
                try {
                    // Try to find JSON block
                    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                        if (parsed) {
                            // Extract message/reply/answer/response
                            cleanText = parsed.message || parsed.reply || parsed.answer || parsed.response || textResponse;
                            // Update the text response to be the clean version for the prompt
                            if (typeof cleanText === 'string') {
                                console.log('[AI_AGENT] Unwrapped JSON text for interaction:', cleanText);
                            } else {
                                cleanText = textResponse; // Fallback if parsing yielded non-string
                            }
                        }
                    }
                } catch (e) {
                    // Ignore JSON parse errors, assume plain text
                }

                // CHECK FOR IMPLIED QUESTIONS (Interactive Loop Logic)
                // If the model asks a question but didn't call 'ask_user', we force it.
                // Keywords: ?, "misiniz", "mısınız", "devam", "başka"
                const isQuestion = cleanText.includes('?') ||
                    cleanText.match(/(misiniz|mısınız|musunuz|müsünüz)\b/i) ||
                    cleanText.toLowerCase().includes('başka bir işlem');

                // Prevent infinite loops on things like "How are you?" -> naive check, but mainly for task flows
                if (isQuestion && toolExecutor) {
                    console.log('[AI_AGENT] Detected implied question in text. Converting to "ask_user" tool call.');

                    // Inject implicit tool call
                    const implicitCall = {
                        name: 'ask_user',
                        args: { prompt: cleanText }
                    };

                    try {
                        console.log(`[AI_AGENT] Auto-Executing ${implicitCall.name} with`, implicitCall.args);
                        const askResult = await toolExecutor(implicitCall.name, implicitCall.args);

                        // Feed result back to history
                        sessionHistory.push({
                            role: 'model',
                            parts: [{ text: textResponse }] // The model's question
                        });

                        // CRITICAL FIX: Process attachments from ask_user result as inline_data
                        let inlineDataParts: any[] = [];
                        let processedResult = askResult;

                        // askResult structure is {success, value: {text, attachments}}
                        // Extract the actual result content
                        const resultContent = (askResult as any)?.value || askResult;

                        // DEBUG: Log the actual structure
                        console.log('[AI_AGENT] DEBUG resultContent:', JSON.stringify(resultContent)?.substring(0, 300));
                        console.log('[AI_AGENT] DEBUG resultContent.attachments:', resultContent?.attachments);

                        if (resultContent && typeof resultContent === 'object' && resultContent.attachments && Array.isArray(resultContent.attachments)) {
                            console.log('[AI_AGENT] Found attachments in implicit ask_user result:', resultContent.attachments.length);
                            const processedImages = await processAttachments(resultContent.attachments);
                            console.log('[AI_AGENT] Processed images from implicit ask_user:', processedImages.length);

                            for (const img of processedImages) {
                                if (isGeminiSupportedMime(img.mimeType)) {
                                    inlineDataParts.push({
                                        inline_data: {
                                            mime_type: img.mimeType,
                                            data: img.base64
                                        }
                                    });
                                    console.log('[AI_AGENT] Added inline_data for:', img.mimeType, 'base64 length:', img.base64?.length);
                                }
                            }

                            // Update result to indicate attachments are inline
                            processedResult = {
                                text: resultContent.text || '',
                                attachments_info: `[${resultContent.attachments.length} file(s) attached - analyzing the image content]`
                            };
                        }

                        // Add inline_data (images) BEFORE the function response
                        sessionHistory.push({
                            role: 'user',
                            parts: [
                                ...inlineDataParts,
                                {
                                    functionResponse: {
                                        name: 'ask_user',
                                        response: { result: processedResult }
                                    }
                                }
                            ]
                        });

                        // Continue loop!
                        continue;

                    } catch (err: any) {
                        console.error('[AI_AGENT] Implicit ask_user failed:', err);
                        // Fall out to break
                    }
                }

                // If not a question or failed, we are done.
                finalResponse = textResponse;
                break; // Exit loop
            }

        } catch (error: any) {
            console.error('[AI_AGENT] ReAct Error:', error);
            return { success: false, error: error.message };
        }
    }

    // Handle Max Iteration reached without completion
    if (loopCount >= AGENT_CONFIG.maxIterations && !finalResponse) {
        console.warn('[AI_AGENT] Reached max iterations without final response');

        // If we actually did some work (called tools), consider it a "Silent Success"
        if (toolCallsCount > 0) {
            console.log(`[AI_AGENT] Treating max iterations as success (Tools called: ${toolCallsCount})`);
            finalResponse = JSON.stringify({
                message: "İşlemler tamamlandı (veya döngü sınırına ulaşıldı).",
                details: `${toolCallsCount} adet araç çalıştırıldı.`
            });
        } else {
            finalResponse = "I apologize, I couldn't complete the task within the time limit. Please try a simpler request or break it into steps.";
        }
    }

    // Save Memory (Long Term) at the end
    if (config.memoryKey && finalResponse) {
        try {
            const memoryDir = (FileSystem.documentDirectory || '') + 'brain/memory/';
            await FileSystem.makeDirectoryAsync(memoryDir, { intermediates: true });
            const memoryPath = memoryDir + config.memoryKey + '.json';

            // Convert sessionHistory to simple format for storage
            const simpleHistory = sessionHistory
                .filter(turn => turn.role === 'user' || turn.role === 'model')
                .map(turn => ({
                    role: turn.role,
                    content: turn.parts?.map((p: any) => p.text).filter(Boolean).join(' ') || ''
                }));

            await FileSystem.writeAsStringAsync(memoryPath, JSON.stringify(simpleHistory));
            console.log('[AI_AGENT] Memory saved to:', config.memoryKey);
        } catch (err) {
            console.warn('[AI_AGENT] Failed to save memory:', err);
        }
    }

    // Save to variable if specified
    if (config.variableName) {
        // CHECK: Did the agent ALREADY set this variable via 'set_variable' tool?
        const existingValue = variableManager.get(config.variableName);
        let valueToSave: any = finalResponse;

        // If finalResponse is empty or just a confirmation message, but we have a value from tools, keep the tool value!
        if (existingValue) {
            console.log(`[AI_AGENT] Variable '${config.variableName}' was set by tool. Preserving value:`, typeof existingValue);
            // Verify if finalResponse is just a message wrapper. If so, discard it in favor of the real data if needed.
            // But usually keeping existingValue is safer if finalResponse is not valid JSON.
            if (!finalResponse || (typeof finalResponse === 'string' && !finalResponse.trim().startsWith('{'))) {
                // Keep the tool value
                valueToSave = existingValue;
            }
        }

        // If we didn't use existingValue, then parse finalResponse
        if (valueToSave === finalResponse && finalResponse) {
            // ... (JSON parsing logic) ...

            // Attempt to parse as JSON if it looks like JSON
            if (typeof finalResponse === 'string') {
                try {
                    // 1. Try direct parse
                    const parsed = JSON.parse(finalResponse);
                    valueToSave = parsed;
                    console.log('[AI_AGENT] Direct JSON parse successful');

                    // CRITICAL FIX: Unwrap JSON if it's meant to be text
                    // Users hate seeing {"message": "..."} in the text output
                    if (valueToSave && typeof valueToSave === 'object' && !Array.isArray(valueToSave)) {
                        const keys = Object.keys(valueToSave);
                        // If it has a 'message' or 'response' field, use that as the value
                        if (valueToSave.message && typeof valueToSave.message === 'string') {
                            valueToSave = valueToSave.message;
                            console.log('[AI_AGENT] Unwrapped JSON property "message" to string');
                        } else if (valueToSave.response && typeof valueToSave.response === 'string') {
                            valueToSave = valueToSave.response;
                            console.log('[AI_AGENT] Unwrapped JSON property "response" to string');
                        } else if (valueToSave.answer && typeof valueToSave.answer === 'string') {
                            valueToSave = valueToSave.answer;
                            console.log('[AI_AGENT] Unwrapped JSON property "answer" to string');
                        }
                    }

                } catch (e) {
                    // 2. Try to find JSON block in markdown ```json ... ```
                    const jsonBlockMatch = finalResponse.match(/```json\n([\s\S]*?)\n```/);
                    if (jsonBlockMatch) {
                        try {
                            const parsed = JSON.parse(jsonBlockMatch[1]);
                            valueToSave = parsed;
                            console.log('[AI_AGENT] Extracted JSON from code block');

                            // Same unwrap logic for code blocks
                            if (valueToSave && typeof valueToSave === 'object' && !Array.isArray(valueToSave)) {
                                if (valueToSave.message && typeof valueToSave.message === 'string') {
                                    valueToSave = valueToSave.message;
                                } else if (valueToSave.response && typeof valueToSave.response === 'string') {
                                    valueToSave = valueToSave.response;
                                }
                            }

                        } catch (err) {
                            // Leave as string
                        }
                    }
                    // 3. Clean up markdown bold/italic if it's just a string wrapper
                    // e.g. "**Result:** ..." -> "Result: ..." (Optional)
                }
            }
        }
        // 3. Try to find generic object pattern { ... } using regex
        // Matches { starts, content inside, and ends with }
        // Note: Simple regex might fail on nested objects but covers most basic cases
        const objectMatch = finalResponse.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                valueToSave = JSON.parse(objectMatch[0]);
                console.log('[AI_AGENT] Extracted JSON using Regex detection');
            } catch (err) {
                console.log('[AI_AGENT] Regex matched object-like text but failed to parse JSON');
            }
        }
        variableManager.set(config.variableName, valueToSave);
        console.log('[AI_AGENT] Saved response to variable:', config.variableName, typeof valueToSave);
    }

    return {
        success: true,
        response: finalResponse,
        provider: config.provider || 'gemini',
        toolCalls: toolCallsCount,
        iterations: loopCount
    };
}


// --- HELPERS ---

async function getApiKey(config: AgentAIConfig) {
    // If explicit API key provided in config, use it
    if (config.apiKey) {
        return config.apiKey;
    }

    try {
        await userSettingsService.ensureLoaded();
        const settings = userSettingsService.getSettings();
        const provider = config.provider || 'gemini';

        // Check provider-specific key first
        switch (provider) {
            case 'openai':
                if (settings.openaiApiKey) return settings.openaiApiKey;
                break;
            case 'claude':
                if (settings.claudeApiKey) return settings.claudeApiKey;
                break;
            case 'gemini':
            default:
                if (settings.geminiApiKey) return settings.geminiApiKey;
                break;
        }

        // Fallback: try to get any available key
        const bestKey = userSettingsService.getBestApiKey();
        if (bestKey?.apiKey) {
            console.log(`[AI_AGENT] Provider '${provider}' key not found, falling back to '${bestKey.provider}'`);
            return bestKey.apiKey;
        }

        throw new Error(`API anahtarı bulunamadı. Lütfen Ayarlar'dan ${provider === 'openai' ? 'OpenAI' : provider === 'claude' ? 'Claude' : 'Gemini'} API anahtarınızı girin.`);

    } catch (e: any) {
        console.error('[AI_AGENT] Failed to load UserSettings for API Key:', e);
        throw new Error(e.message || 'Ayarlar servisi yüklenemedi. Lütfen uygulamayı yeniden başlatın.');
    }
}

function hasContext(prompt: string) {
    return prompt.includes('[SYSTEM CONTEXT START]');
}

async function injectContext(prompt: string) {
    try {
        const { contextService } = require('../ContextService');
        const context = await contextService.getContext();
        const dateObj = new Date(context.timestamp);
        const humanDate = dateObj.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const contextString = `
[SYSTEM CONTEXT START]
CURRENT DATE: ${humanDate} (${context.timestamp})
IMPORTANT: You are running in REAL-TIME. Your training data is old. Trust this date and use 'search_web' for recent events.

Battery: ${context.battery.level}% (${context.battery.state === 1 ? 'Unplugged' : 'Charging'}, LowPower: ${context.battery.lowPowerMode})
Network: ${context.network.type} (Connected: ${context.network.isConnected})
Location: ${context.location ? `${context.location.latitude}, ${context.location.longitude}` : 'Unknown'}
Sensors:
- Light: ${context.sensors.light !== undefined ? `${context.sensors.light} lux` : 'N/A'}
- Steps: ${context.sensors.steps !== undefined ? context.sensors.steps : 'N/A'}
- Heading: ${context.sensors.heading !== undefined ? `${context.sensors.heading}°` : 'N/A'}
- Pressure: ${context.sensors.pressure !== undefined ? `${context.sensors.pressure} hPa` : 'N/A'}

[AVAILABLE CAPABILITIES]
The user has access to a powerful Workflow automation engine. You can suggest using these nodes:
- FILES: VIEW_UDF (UYAP Docs), FILE_READ/WRITE/PICK, PDF_CREATE
- AI: AGENT_AI (LLM), IMAGE_GENERATOR (Gemini/Pollinations), IMAGE_EDIT, SPEECH_TO_TEXT
- GOOGLE: Gmail, Sheets, Drive
- MICROSOFT: Outlook, Excel
- SENSORS: Light, Pedometer, Barometer, Magnetometer, Battery, Network, Location, Gesture Trigger (Shake, Face Down/Up, 4 Taps)
- DEVICE: Flashlight, DND, Brightness, Volume, App Launch, Screen Wake
- COMM: SMS, Email, Telegram, Slack, Call Trigger
- WEB: HTTP Request, Open URL, Google Translate, RSS Read
- LOGIC: If/Else, Loop, Delay, Variable, Switch
- UI: Show Text, Show Image, Show Menu, Notification, Share Sheet
[SYSTEM CONTEXT END]
`;
        return contextString + "\n\n" + prompt;
    } catch (e) {
        console.warn('[AI_AGENT] Failed to inject context', e);
        return prompt;
    }
}

async function resolveAttachments(config: AgentAIConfig, vm: VariableManager): Promise<{ parts: { base64: string; mimeType: string }[]; metadata: string }> {
    let attachmentVar: any = null;
    let attachmentSource = 'none';

    if (config.attachments) {
        // Explicit configuration takes priority
        attachmentVar = vm.get(config.attachments);
        if (attachmentVar) {
            attachmentSource = `config.attachments (${config.attachments})`;
        }
    }

    if (!attachmentVar) {
        // Try 'inputImage' as legacy fallback
        attachmentVar = vm.get('inputImage');
        if (attachmentVar) {
            attachmentSource = 'inputImage (legacy)';
        }
    }

    // CRITICAL FIX: Check userInput variable (from CHAT_INPUT_TRIGGER / TEXT_INPUT)
    // This is where InteractionModal attachments are stored!
    if (!attachmentVar) {
        const userInput = vm.get('userInput');
        if (userInput && typeof userInput === 'object') {
            if ((userInput as any).attachments && Array.isArray((userInput as any).attachments)) {
                attachmentVar = (userInput as any).attachments;
                attachmentSource = 'userInput.attachments';
                console.log('[AI_AGENT] Found attachments in userInput variable:', attachmentVar.length);
            } else if ((userInput as any).uri && isValidAttachmentUri((userInput as any).uri)) {
                attachmentVar = userInput;
                attachmentSource = 'userInput.uri';
            }
        }
    }

    // Also check triggerInput and workflow_input as potential trigger attachment sources
    if (!attachmentVar) {
        for (const varName of ['triggerInput', 'workflow_input', 'input']) {
            const triggerVar = vm.get(varName);
            if (triggerVar && typeof triggerVar === 'object') {
                if ((triggerVar as any).attachments && Array.isArray((triggerVar as any).attachments)) {
                    attachmentVar = (triggerVar as any).attachments;
                    attachmentSource = `${varName}.attachments`;
                    console.log(`[AI_AGENT] Found attachments in ${varName} variable:`, attachmentVar.length);
                    break;
                }
            }
        }
    }

    if (!attachmentVar) {
        // Check previous_output for file picker style output
        const prevOutput = vm.get('previous_output');
        if (prevOutput && typeof prevOutput === 'object') {
            // Single file object with uri
            if ((prevOutput as any).uri && isValidAttachmentUri((prevOutput as any).uri)) {
                attachmentVar = prevOutput;
                attachmentSource = 'previous_output.uri';
            }
            // Array of files
            else if (Array.isArray(prevOutput) && prevOutput[0]?.uri) {
                attachmentVar = prevOutput;
                attachmentSource = 'previous_output (array)';
            }
            // Nested files property (from FILE_PICK output)
            else if ((prevOutput as any).files && Array.isArray((prevOutput as any).files)) {
                attachmentVar = (prevOutput as any).files;
                attachmentSource = 'previous_output.files';
            }
            // InteractionModal output style { text: ..., attachments: [...] }
            else if ((prevOutput as any).attachments && Array.isArray((prevOutput as any).attachments)) {
                attachmentVar = (prevOutput as any).attachments;
                attachmentSource = 'previous_output.attachments';
            }
        }
    }

    if (!attachmentVar) {
        // Last resort: Scan all variables for anything with a uri
        const allVars = vm.getAll();
        for (const [key, value] of Object.entries(allVars)) {
            if (value && typeof value === 'object' && !Array.isArray(value) && (value as any).uri && isValidAttachmentUri((value as any).uri)) {
                attachmentVar = value;
                attachmentSource = `auto-detected from '${key}'`;
                break;
            }
        }
    }

    let imageData: { base64: string; mimeType: string }[] = [];
    let metadata = "";

    if (attachmentVar) {
        console.log('[AI_AGENT] Found attachments from:', attachmentSource);
        imageData = await processAttachments(attachmentVar);
        console.log('[AI_AGENT] Processed images count:', imageData.length);

        // Extract metadata for Prompt
        const items = Array.isArray(attachmentVar) ? attachmentVar : [attachmentVar];
        items.forEach((item: any) => {
            if (item && item.uri) {
                // Clean up URI for display if needed, but exact URI is better for tools
                metadata += `Attached File: ${item.name || 'unknown'} (URI: ${item.uri})\n`;
            } else if (typeof item === 'string') {
                if (item.startsWith('file://')) {
                    metadata += `Attached File: file (URI: ${item})\n`;
                }
            }
        });
    } else {
        console.log('[AI_AGENT] No attachments found (checked: config, inputImage, previous_output, all variables)');
    }

    return { parts: imageData, metadata };
}

// Gemini supported MIME types for inline_data
const GEMINI_SUPPORTED_MIME_PREFIXES = [
    'image/',      // All image types
    'audio/',      // All audio types
    'video/',      // All video types
    'text/',       // All text types
    'application/pdf',
    'application/json',
    'application/xml'
];

function isGeminiSupportedMime(mimeType: string): boolean {
    if (!mimeType) return false;
    const lower = mimeType.toLowerCase();

    // Reject Office files explicitly
    if (lower.includes('vnd.openxmlformats') ||
        lower.includes('vnd.ms-') ||
        lower.includes('msword') ||
        lower.includes('spreadsheetml') ||
        lower.includes('wordprocessingml') ||
        lower.includes('presentationml')) {
        return false;
    }

    return GEMINI_SUPPORTED_MIME_PREFIXES.some(prefix => lower.startsWith(prefix));
}

function buildParts(text: string, images: any[]) {
    const parts: any[] = [];
    // Images first - but filter out unsupported types
    if (images) {
        images.forEach(img => {
            if (isGeminiSupportedMime(img.mimeType)) {
                parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
            } else {
                console.warn('[AI_AGENT] Skipping unsupported file type for Gemini:', img.mimeType);
                // Add as text mention instead
                parts.push({ text: `[Attached file with type ${img.mimeType} - analysis not supported]` });
            }
        });
    }
    parts.push({ text });
    return parts;
}


// --- GEMINI API CALLER (ReAct Aware) ---

async function callGeminiReAct(
    apiKey: string,
    model: string,
    history: any[], // Full chat history including tool calls/responses
    temperature: number,
    enableTools: boolean,
    jsonMode: boolean = false
): Promise<{ text?: string, functionCalls?: { name: string, args: any }[], historyItem: any, usedModel?: string }> {

    const tools = enableTools ? getGeminiTools() : undefined;

    // DEBUG: Log tools being sent
    if (tools) {
        console.log('[AI_AGENT] Sending tools to Gemini:', tools.length, 'tools');
        console.log('[AI_AGENT] Tool names:', tools.map((t: any) => t.function_declarations?.map((f: any) => f.name)).flat());
    } else {
        console.log('[AI_AGENT] No tools enabled');
    }

    const MAX_RETRIES = 3;
    let lastError;
    let currentModel = model;
    const FALLBACK_MODEL = 'gemini-2.5-flash';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Add maxOutputTokens to prevent early truncation
            const generationConfig = {
                temperature,
                maxOutputTokens: 8192,
                responseMimeType: (jsonMode && !tools) ? 'application/json' : 'text/plain'
            };

            const body = {
                contents: history,
                tools: tools,
                generationConfig
            };

            console.log(`[AI_AGENT] Connection Attempt ${attempt} (Model: ${currentModel})...`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error?.message || 'Gemini API Error';

                // CRITICAL: Handle Resource Exhaustion (429)
                if (response.status === 429 || errorMessage.includes('resource has been exhausted') || errorMessage.includes('quota')) {
                    console.warn(`[AI_AGENT] Quota exceeded on ${currentModel}.`);

                    if (currentModel !== FALLBACK_MODEL && attempt < MAX_RETRIES) {
                        console.log(`[AI_AGENT] Switching to fallback model: ${FALLBACK_MODEL}`);
                        currentModel = FALLBACK_MODEL;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue; // Retry immediately with new model
                    }
                }

                if (response.status >= 500) {
                    throw new Error(data.error?.message || 'Gemini Server Error');
                }
                throw new Error(errorMessage);
            }

            const candidate = data.candidates?.[0];
            if (!candidate) {
                console.warn(`[AI_AGENT] Attempt ${attempt}: No candidates (Model: ${currentModel}). Retrying...`);
                throw new Error('No response from Gemini (Empty candidates)');
            }

            const content = candidate.content;

            // CRITICAL FIX: content can be undefined if model blocks or has no response
            if (!content) {
                console.warn(`[AI_AGENT] Attempt ${attempt}: candidate.content is undefined`);
                throw new Error('Gemini returned empty content (model may have blocked the response)');
            }

            const parts = content.parts || [];

            // Check for Function Calls
            const functionCalls: { name: string, args: any }[] = [];
            let textObj = "";

            parts.forEach((part: any) => {
                if (part.functionCall) {
                    functionCalls.push({
                        name: part.functionCall.name,
                        args: part.functionCall.args
                    });
                }
                if (part.text) {
                    textObj += part.text;
                }
            });

            console.log('[AI_AGENT] Gemini response - Text:', textObj.substring(0, 100), 'Function calls:', functionCalls.length);

            return {
                text: textObj,
                functionCalls,
                historyItem: content,
                usedModel: currentModel
            };

        } catch (error: any) {
            lastError = error;
            console.warn(`[AI_AGENT] Attempt ${attempt} failed: ${error.message}`);

            if (attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`[AI_AGENT] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Gemini API Request Failed after retries');
}

// --- OPENAI API CALLER (Chat Completions with Tools) ---

async function callOpenAIReAct(
    apiKey: string,
    model: string,
    history: any[],
    temperature: number,
    enableTools: boolean
): Promise<{ text?: string, functionCalls?: { name: string, args: any }[], historyItem: any }> {

    const tools = enableTools ? getOpenAITools() : undefined;

    // Convert Gemini history format to OpenAI messages format
    const messages = history.map(turn => {
        const role = turn.role === 'model' ? 'assistant' : 'user';

        // Check for function responses (tool results)
        const functionResponses = turn.parts?.filter((p: any) => p.functionResponse);
        if (functionResponses && functionResponses.length > 0) {
            // OpenAI expects tool results as separate messages
            return functionResponses.map((fr: any) => ({
                role: 'tool' as const,
                tool_call_id: fr.functionResponse.name, // Use name as ID for simplicity
                content: JSON.stringify(fr.functionResponse.response)
            }));
        }

        // Check for function calls
        const functionCalls = turn.parts?.filter((p: any) => p.functionCall);
        if (functionCalls && functionCalls.length > 0) {
            return {
                role: 'assistant' as const,
                content: turn.parts?.find((p: any) => p.text)?.text || null,
                tool_calls: functionCalls.map((fc: any, idx: number) => ({
                    id: fc.functionCall.name,
                    type: 'function' as const,
                    function: {
                        name: fc.functionCall.name,
                        arguments: JSON.stringify(fc.functionCall.args)
                    }
                }))
            };
        }

        // Regular text message
        const textContent = turn.parts?.map((p: any) => p.text).filter(Boolean).join(' ') || '';
        return { role, content: textContent };
    }).flat();

    const MAX_RETRIES = 3;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const body: any = {
                model: model || 'gpt-4o',
                messages,
                temperature,
                max_tokens: 4096
            };

            if (tools && tools.length > 0) {
                body.tools = tools;
                body.tool_choice = 'auto';
            }

            console.log(`[AI_AGENT] OpenAI Request Attempt ${attempt} (Model: ${model})...`);

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error?.message || 'OpenAI API Error';
                if (response.status === 429) {
                    console.warn('[AI_AGENT] OpenAI rate limit hit, retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                    continue;
                }
                throw new Error(errorMessage);
            }

            const choice = data.choices?.[0];
            if (!choice) {
                throw new Error('No response from OpenAI (Empty choices)');
            }

            const message = choice.message;
            const functionCalls: { name: string, args: any }[] = [];
            let textObj = message.content || '';

            // Parse tool_calls
            if (message.tool_calls && message.tool_calls.length > 0) {
                message.tool_calls.forEach((tc: any) => {
                    if (tc.type === 'function') {
                        let args = {};
                        try {
                            args = JSON.parse(tc.function.arguments || '{}');
                        } catch (e) {
                            console.warn('[AI_AGENT] Failed to parse OpenAI function args:', tc.function.arguments);
                        }
                        functionCalls.push({
                            name: tc.function.name,
                            args
                        });
                    }
                });
            }

            console.log('[AI_AGENT] OpenAI response - Text:', textObj.substring(0, 100), 'Function calls:', functionCalls.length);

            // Convert back to Gemini-like history format for consistency
            const historyItem: any = {
                role: 'model',
                parts: []
            };

            if (textObj) {
                historyItem.parts.push({ text: textObj });
            }

            functionCalls.forEach(fc => {
                historyItem.parts.push({
                    functionCall: { name: fc.name, args: fc.args }
                });
            });

            return { text: textObj, functionCalls, historyItem };

        } catch (error: any) {
            lastError = error;
            console.warn(`[AI_AGENT] OpenAI Attempt ${attempt} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    throw lastError || new Error('OpenAI API Request Failed after retries');
}

// --- CLAUDE API CALLER (Messages API with Tools) ---

async function callClaudeReAct(
    apiKey: string,
    model: string,
    history: any[],
    temperature: number,
    enableTools: boolean
): Promise<{ text?: string, functionCalls?: { name: string, args: any }[], historyItem: any }> {

    const tools = enableTools ? getClaudeTools() : undefined;

    // Convert Gemini history format to Claude messages format
    const messages: any[] = [];

    history.forEach(turn => {
        const role = turn.role === 'model' ? 'assistant' : 'user';

        // Check for function responses (tool results)
        const functionResponses = turn.parts?.filter((p: any) => p.functionResponse);
        if (functionResponses && functionResponses.length > 0) {
            // Claude expects tool_result blocks in user messages
            messages.push({
                role: 'user',
                content: functionResponses.map((fr: any) => ({
                    type: 'tool_result',
                    tool_use_id: fr.functionResponse.name,
                    content: JSON.stringify(fr.functionResponse.response)
                }))
            });
            return;
        }

        // Check for function calls
        const functionCalls = turn.parts?.filter((p: any) => p.functionCall);
        if (functionCalls && functionCalls.length > 0) {
            const content: any[] = [];
            const textPart = turn.parts?.find((p: any) => p.text);
            if (textPart) {
                content.push({ type: 'text', text: textPart.text });
            }
            functionCalls.forEach((fc: any) => {
                content.push({
                    type: 'tool_use',
                    id: fc.functionCall.name,
                    name: fc.functionCall.name,
                    input: fc.functionCall.args
                });
            });
            messages.push({ role: 'assistant', content });
            return;
        }

        // Regular text message
        const textContent = turn.parts?.map((p: any) => p.text).filter(Boolean).join(' ') || '';
        if (textContent) {
            messages.push({ role, content: textContent });
        }
    });

    const MAX_RETRIES = 3;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const body: any = {
                model: model || 'claude-3-5-sonnet-20241022',
                messages,
                max_tokens: 4096,
                temperature
            };

            if (tools && tools.length > 0) {
                body.tools = tools;
            }

            console.log(`[AI_AGENT] Claude Request Attempt ${attempt} (Model: ${model})...`);

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error?.message || 'Claude API Error';
                if (response.status === 429) {
                    console.warn('[AI_AGENT] Claude rate limit hit, retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                    continue;
                }
                throw new Error(errorMessage);
            }

            const content = data.content || [];
            const functionCalls: { name: string, args: any }[] = [];
            let textObj = '';

            // Parse content blocks
            content.forEach((block: any) => {
                if (block.type === 'text') {
                    textObj += block.text;
                } else if (block.type === 'tool_use') {
                    functionCalls.push({
                        name: block.name,
                        args: block.input || {}
                    });
                }
            });

            console.log('[AI_AGENT] Claude response - Text:', textObj.substring(0, 100), 'Function calls:', functionCalls.length);

            // Convert back to Gemini-like history format for consistency
            const historyItem: any = {
                role: 'model',
                parts: []
            };

            if (textObj) {
                historyItem.parts.push({ text: textObj });
            }

            functionCalls.forEach(fc => {
                historyItem.parts.push({
                    functionCall: { name: fc.name, args: fc.args }
                });
            });

            return { text: textObj, functionCalls, historyItem };

        } catch (error: any) {
            lastError = error;
            console.warn(`[AI_AGENT] Claude Attempt ${attempt} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    throw lastError || new Error('Claude API Request Failed after retries');
}

/**
 * Process attachments into base64 format for API calls
 * Uses modern expo-file-system File class (SDK 54+)
 */
async function processAttachments(attachmentVar: any): Promise<{ base64: string; mimeType: string }[]> {
    const results: { base64: string; mimeType: string }[] = [];

    try {
        // Normalize to array
        const items = Array.isArray(attachmentVar) ? attachmentVar : [attachmentVar];

        for (const item of items) {
            if (!item) continue;

            // Handle different input types
            if (typeof item === 'string') {
                if (item.startsWith('data:image')) {
                    // Already base64 data URL
                    const match = item.match(/^data:([^;]+);base64,(.+)$/);
                    if (match) {
                        results.push({ base64: match[2], mimeType: match[1] });
                    }
                } else if (item.startsWith('file://') || item.startsWith('/') || item.startsWith('content://')) {
                    // File URI - read using modern File class
                    try {
                        const base64 = await readFileAsBase64(item);
                        let mimeType = getMimeType(item);

                        // CRITICAL FIX: Gemini rejects 'application/octet-stream'
                        // If we have octet-stream, try to re-detect from extension, or force text/plain
                        if (mimeType === 'application/octet-stream') {
                            console.log('[AI_AGENT] Octet-stream detected, attempting to fix...', item);
                            const reDetected = getMimeType(item);
                            // If getMimeType returns octet-stream (fallback) or something else, use it.
                            // But we configured getMimeType to return text/plain as fallback now.
                            mimeType = reDetected;

                            // Double check
                            if (mimeType === 'application/octet-stream') {
                                mimeType = 'text/plain';
                            }
                        }
                        results.push({ base64, mimeType });
                    } catch (err) {
                        console.warn('[AI_AGENT] Could not read file:', item, err);
                    }
                } else if (item.startsWith('http')) {
                    // Remote URL - fetch and convert
                    try {
                        const response = await fetch(item);
                        const blob = await response.blob();
                        const base64 = await blobToBase64(blob);
                        const mimeType = blob.type || 'image/jpeg';
                        results.push({ base64, mimeType });
                    } catch (err) {
                        console.warn('[AI_AGENT] Could not fetch URL:', item, err);
                    }
                }
            } else if (typeof item === 'object' && item.uri) {
                // Object with uri property (from image picker / file picker)
                try {
                    const base64 = await readFileAsBase64(item.uri);
                    let mimeType = item.mimeType || getMimeType(item.uri);

                    // CRITICAL FIX: Gemini rejects 'application/octet-stream'
                    if (mimeType === 'application/octet-stream') {
                        console.log('[AI_AGENT] Octet-stream detected (object), attempting to fix...', item.uri);
                        // Try to re-detect from URI extension
                        const reDetected = getMimeType(item.uri);
                        mimeType = reDetected;

                        // Double check
                        if (mimeType === 'application/octet-stream') {
                            mimeType = 'text/plain';
                        }
                    }
                    results.push({ base64, mimeType });
                } catch (err) {
                    console.warn('[AI_AGENT] Could not read object uri:', item.uri, err);
                }
            }
        }
    } catch (error) {
        console.error('[AI_AGENT] Error processing attachments:', error);
    }

    return results;
}

/**
 * Read a file as base64 using modern expo-file-system File class
 */
async function readFileAsBase64(uri: string): Promise<string> {
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'udf': 'text/xml', // UDF is XML
        'xml': 'text/xml',
        'txt': 'text/plain',
        'json': 'application/json'
    };
    // Default to text/plain instead of octet-stream because Gemini rejects octet-stream
    return mimeMap[ext || ''] || 'text/plain';
}

/**
 * Check if a URI points to a valid attachment (Image, PDF, UDF)
 */
function isValidAttachmentUri(uri: string): boolean {
    if (!uri || typeof uri !== 'string') return false;
    const lowerUri = uri.toLowerCase();
    const validExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', // Images
        '.pdf', '.udf', '.xml', '.txt', '.json' // Docs
    ];
    return validExtensions.some(ext => lowerUri.includes(ext)) ||
        lowerUri.includes('image/') ||
        lowerUri.includes('application/') ||
        lowerUri.includes('text/') ||
        lowerUri.includes('/dcim/') ||
        lowerUri.includes('/pictures/') ||
        lowerUri.includes('/camera/') ||
        lowerUri.includes('/documents/');
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64 = result.split(',')[1] || result;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
