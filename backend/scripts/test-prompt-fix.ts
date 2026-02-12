
import { SYSTEM_PROMPT_TURKISH } from '../src/lib/prompt-templates';
import { getFlash25Model } from '../src/lib/gemini';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function testPrompt() {
    console.log('Testing Workflow Generation with New Prompt...');

    // Test case: "Yarın saat 2'de toplantı ekle"
    // Expected: MANUAL_TRIGGER -> CALENDAR_CREATE
    // NOT Expected: INTENT_ACTION, steps
    const userPrompt = "Yarın saat 2'de toplantı ekle";

    console.log(`\nUser Prompt: "${userPrompt}"`);

    try {
        const model = getFlash25Model();
        const result = await model.generateContent([
            { text: SYSTEM_PROMPT_TURKISH },
            { text: `Kullanıcı komutu: "${userPrompt}"` }
        ]);

        const response = await result.response;
        const text = response.text();

        console.log('\n--- RAW AI RESPONSE ---');
        console.log(text);

        const jsonStr = text.replace(/^```json\n|\n```$/g, '').trim();
        const data = JSON.parse(jsonStr);

        // Check for Legacy Format
        if (data.steps) {
            console.error('\n❌ FAILED: AI returned legacy "steps" format instead of "nodes".');
            return;
        }

        console.log('\n--- PARSED NODES ---');
        if (data.nodes) {
            data.nodes.forEach((node: any) => {
                console.log(`[${node.id}] ${node.type} - ${node.label || ''}`);
            });
        }

        // Verification Logic
        const types = data.nodes ? data.nodes.map((n: any) => n.type) : [];
        const hasIntent = types.includes('INTENT_ACTION');
        const hasCalendar = types.includes('CALENDAR_CREATE');

        if (hasIntent) {
            console.error('\n❌ FAILED: Found generic INTENT_ACTION instead of specialized node.');
        } else if (hasCalendar) {
            console.log('\n✅ PASSED: Correctly used CALENDAR_CREATE node.');
        } else {
            console.warn('\n⚠️ WARNING: CALENDAR_CREATE not found, check output.');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testPrompt();
