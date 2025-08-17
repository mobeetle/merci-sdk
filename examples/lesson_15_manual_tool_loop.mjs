// lesson_15_manual_tool_loop.mjs
// Merci SDK Tutorial: Lesson 15 - The Manual Tool-Use Loop

// --- IMPORTS ---
// We need more helpers to manually construct the messages for the tool loop.
import {
    MerciClient,
    createUserMessage,
    executeTools,
    createAssistantToolCallMessage,
    createToolResultMessage,
    createAssistantTextMessage
} from '../lib/merci.2.11.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION ---
const weatherTool = {
    name: 'get_current_weather',
    description: 'Get the current weather for a specified city.',
    parameters: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
    execute: async ({ city }) => {
        console.log(`\n[TOOL EXECUTING] Getting weather for ${city}...`);
        const temperatures = { 'paris': { temperature: '14', unit: 'celsius' } };
        return temperatures[city.toLowerCase()] || { error: 'City not found' };
    },
};

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 15 - The Manual Tool-Use Loop (Model: ${MODEL}) ---`);
    console.log('This lesson deconstructs the `.run()` agent to show the fundamental steps.');

    try {
        // --- STEP 1: INITIALIZE CLIENT AND SESSION ---
        console.log('\n[STEP 1] Initializing client and configuring session with tools...');
        const client = new MerciClient({ token });
        const chatSession = client.chat(MODEL).withTools([weatherTool]);

        // --- STEP 2: PREPARE INITIAL PROMPT AND MESSAGE HISTORY ---
        console.log('[STEP 2] Preparing initial user prompt...');
        const userPrompt = "What's the weather like in Paris?";
        const messages = [createUserMessage(userPrompt)];
        console.log(`👤 User > ${userPrompt}`);

        // --- STEP 3: FIRST API CALL - GET THE TOOL CALL REQUEST ---
        console.log('\n[STEP 3] Making the first API call to get the model\'s tool request...');
        let toolCalls = [];
        let assistantFirstResponse = ''; // The model might say something before calling a tool.
        process.stdout.write('🤖 Assistant (thinking) > ');

        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                process.stdout.write(event.content);
                assistantFirstResponse += event.content;
            } else if (event.type === 'tool_calls') {
                console.log(`\n[INFO] Intercepted a request to call ${event.calls.length} tool(s).`);
                toolCalls = event.calls;
            }
        }
        process.stdout.write('\n');

        // Add the model's initial text (if any) to history.
        if (assistantFirstResponse) {
            messages.push(createAssistantTextMessage(assistantFirstResponse));
        }

        // --- STEP 4: EXECUTE THE TOOL LOCALLY ---
        console.log('\n[STEP 4] Executing the requested tool locally...');
        const toolResults = await executeTools(toolCalls, [weatherTool]);
        console.log('[INFO] Tool execution finished.');

        // --- STEP 5: UPDATE MESSAGE HISTORY WITH TOOL RESULTS ---
        console.log('[STEP 5] Updating message history with the tool call and its result...');
        toolResults.forEach((result, index) => {
            const call = toolCalls[index];
            messages.push(createAssistantToolCallMessage(call.id, call.name, call.arguments));
            messages.push(createToolResultMessage(call.id, call.name, JSON.stringify(result.result)));
        });
        console.log('[INFO] History updated. Ready for the final API call.');

        // --- STEP 6: SECOND API CALL - GET THE FINAL NATURAL LANGUAGE RESPONSE ---
        console.log('\n[STEP 6] Making the second API call to get the final summary...');
        let finalResponse = '';
        process.stdout.write('🤖 Assistant (summarizing) > ');
        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                process.stdout.write(event.content);
                finalResponse += event.content;
            }
        }
        process.stdout.write('\n');
        console.log('\n[INFO] Stream finished. Response fully received.');

        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Assistant > ${finalResponse}`);
        console.log('--------------------');
        console.log('Notice the two-step process: first the tool call, then the final answer.');

    } catch (error) {
        console.error('\n\n[FATAL ERROR] An error occurred during the operation.');
        console.error('  Message:', error.message);
        if (error.status) { console.error('  API Status:', error.status); }
        if (error.details) { console.error('  Details:', JSON.stringify(error.details, null, 2)); }
        if (error.stack) { console.error('  Stack:', error.stack); }
        console.error('\n  Possible causes: Invalid token, network issues, or an API service problem.');
        process.exit(1);
    }
}

main().catch(console.error);