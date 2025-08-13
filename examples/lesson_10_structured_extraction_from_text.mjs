// lesson_10_structured_extraction_from_text.mjs
// Merci SDK Tutorial: Lesson 10 - Structured Extraction from Text

// --- IMPORTS ---
import { MerciClient, createUserMessage } from '../lib/merci.2.11.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION (SCHEMA ONLY) ---
// NOTE: No `execute` function is needed for this pattern!
const actionItemExtractorTool = {
    name: 'extract_action_items',
    description: 'A tool to hold the extracted action items from a text.',
    parameters: {
        type: 'object',
        properties: {
            action_items: {
                type: 'array',
                description: 'An array of all action items found in the text.',
                items: {
                    type: 'object',
                    properties: {
                        task: { type: 'string', description: 'A clear description of the action to be taken.' },
                        assigned_to: { type: 'string', description: 'The name of the person responsible for the task.' },
                        due_date: { type: 'string', description: 'The deadline for the task, in YYYY-MM-DD format.' },
                        priority: {
                            type: 'string',
                            description: 'The priority level of the task.',
                            enum: ['High', 'Medium', 'Low']
                        }
                    },
                    required: ['task', 'assigned_to', 'due_date', 'priority']
                }
            }
        },
        required: ['action_items']
    },
};

async function main() {
    console.log(`--- Merci SDK Lesson 10: Structured Extraction (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: DEFINE PROMPT AND INPUT DATA ---
        console.log('[STEP 2] Preparing prompt and input data...');
        const meetingMinutesContent = `
    Meeting Notes: Q4 Strategy Kick-off - 2024-10-28
    Attendees: David, Eve, Frank
    Action Items:
    - Frank is responsible for drafting the initial project specification. This is a High priority task and must be completed by 2024-11-04.
    - Eve will coordinate with the design team to get the new branding assets. This is a Medium priority item with a deadline of 2024-11-08.
    - David needs to book a venue for the end-of-year party. This is a Low priority task, due by 2024-11-15.
    `;
        const userPrompt = `Use the 'extract_action_items' tool to extract all action items from the following text.\n\nTEXT:\n---\n${meetingMinutesContent}\n---`;

        // --- STEP 3: CONFIGURE THE CHAT SESSION ---
        console.log('[STEP 3] Configuring the chat session with the extraction tool...');
        const chatSession = client.chat(MODEL).withTools([actionItemExtractorTool]);

        // --- STEP 4: PREPARE THE MESSAGE PAYLOAD ---
        console.log('[STEP 4] Creating the message payload...');
        const messages = [createUserMessage(userPrompt)];

        // --- STEP 5: EXECUTE AND INTERCEPT THE TOOL CALL ---
        console.log('[STEP 5] Sending request and intercepting tool call...');
        let extractedData = null;
        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'tool_calls') {
                console.log('\n[AGENT ACTION] Model wants to call a tool. Intercepting the call...');
                const argumentsJson = event.calls[0].arguments;
                extractedData = JSON.parse(argumentsJson);
                break; // We have our data, no need to continue.
            }
        }
        console.log('\n[INFO] Stream finished. Response fully received.');

        // --- STEP 6: USE THE EXTRACTED DATA ---
        console.log('\n[STEP 6] Displaying extracted data...');
        console.log('\n\n--- FINAL RESULT ---');
        if (extractedData && extractedData.action_items.length > 0) {
            console.log('✅ Successfully extracted and validated structured data from the text block:');
            console.log(JSON.stringify(extractedData, null, 2));
            const nonHighPriorityTasks = extractedData.action_items.filter(item => item.priority !== 'High');
            console.log(`\nFound ${nonHighPriorityTasks.length} non-high-priority tasks.`);
        } else {
            console.error('❌ Extraction failed. The model did not return any action items.');
            console.log('Received data:', JSON.stringify(extractedData, null, 2));
        }
        console.log('--------------------');

    } catch (error) {
        console.error('\n\n[FATAL ERROR] An error occurred during the operation.');
        console.error('  Message:', error.message);
        if (error.status) {
            console.error('  API Status:', error.status);
        }
        if (error.details) {
            console.error('  Details:', JSON.stringify(error.details, null, 2));
        }
        if (error.stack) {
            console.error('  Stack:', error.stack);
        }
        console.error('\n  Possible causes: Invalid token, network issues, or an API service problem.');
        process.exit(1); // Exit with a non-zero code to indicate failure.
    }
}

main().catch(console.error);