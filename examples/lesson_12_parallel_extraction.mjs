// lesson_12_parallel_extraction.mjs
// Merci SDK Tutorial: Lesson 12 - Advanced Parallel Extraction

// --- IMPORTS ---
import { MerciClient, createUserMessage } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION (FOR A SINGLE ITEM) ---
// The tool's schema represents just ONE item.
// We instruct the model to call this tool for EACH item it finds.
const singleActionItemExtractorTool = {
    name: 'extract_single_action_item',
    parameters: {
        schema: {
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
    },
    // NOTE: No `execute` function is needed. We are only intercepting the calls.
};

async function main() {
    console.log(`--- Merci SDK Lesson 12: Parallel Extraction (Model: ${MODEL}) ---`);

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
    - Also, Frank needs to follow up on the Q3 budget report by the end of the week, say 2024-11-01. This is high priority.
    `;
        const userPrompt = `
    Analyze the following meeting notes.
    For each distinct action item you identify, make a parallel call to the 'extract_single_action_item' tool.

    MEETING NOTES:
    ---
    ${meetingMinutesContent}
    ---
    `;

        // --- STEP 3: CONFIGURE THE CHAT SESSION ---
        console.log('[STEP 3] Configuring chat session for parallel tool use...');
        const chatSession = client
            .chat.session(MODEL)
            .withTools([singleActionItemExtractorTool])
            .withParameters(builder => builder.parallelToolCalls(true));

        // --- STEP 4: PREPARE THE MESSAGE PAYLOAD ---
        console.log('[STEP 4] Creating the message payload...');
        const messages = [createUserMessage(userPrompt)];

        // --- STEP 5: EXECUTE AND INTERCEPT THE PARALLEL TOOL CALLS ---
        console.log('[STEP 5] Sending request and waiting for parallel tool calls...');
        let extractedItems = [];
        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'tool_calls') {
                console.log(`\n[AGENT ACTION] Model wants to make ${event.calls.length} parallel tool calls. Intercepting...`);
                for (const call of event.calls) {
                    const argumentsObject = JSON.parse(call.arguments);
                    extractedItems.push(argumentsObject);
                }
                break; // We have our data, no need to continue.
            }
        }
        console.log('\n[INFO] Stream finished. Response fully received.');

        // --- STEP 6: DISPLAY THE FINAL EXTRACTED DATA ---
        console.log('[STEP 6] Displaying extracted data...');
        console.log('\n\n--- FINAL RESULT ---');
        if (extractedItems.length > 0) {
            console.log(`✅ Successfully extracted ${extractedItems.length} items in a single pass:`);
            console.log(JSON.stringify(extractedItems, null, 2));

            console.log('\nWe can now work with this as a native JavaScript array.');
            const highPriorityCount = extractedItems.filter(item => item.priority === 'High').length;
            console.log(`Found ${highPriorityCount} high-priority tasks.`);
        } else {
            console.error('❌ Extraction failed. The model did not attempt to call the tool.');
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