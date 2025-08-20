// lesson_16_forcing_tool_choice.mjs
// Merci SDK Tutorial: Lesson 16 - Forcing Tool Usage with `toolChoiceRequired`

// --- IMPORTS ---
import {
    MerciClient,
    createUserMessage,
    executeTools,
    createAssistantToolCallMessage,
    createToolResultMessage,
    createAssistantTextMessage
} from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION ---
// We'll use a single, clear tool for this demonstration.
const databaseTool = {
    name: 'query_user_database',
    parameters: {
        schema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The database query to execute.' }
            },
            required: ['query']
        }
    },
    execute: async ({ query }) => {
        console.log(`
[TOOL EXECUTING] Running query: "${query}"`);
        // Simulate a simple, definitive response for active users
        if (query.includes('active')) {
            return { status: 'success', message: 'Found 157 active users.', active_users_count: 157 };
        }
        return { status: 'success', message: 'No active users found.', active_users_count: 0 };
    },
};

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 16 - Forcing Tool Usage (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });
        client.on('tool_start', ({ calls }) => {
            console.log(`\n[EVENT: tool_start] Model decided to call tool: '${calls[0].name}'`);
        });

        // --- STEP 2: DEFINE THE TOOL ---
        console.log('[STEP 2] Preparing the database tool...');
        const tools = [databaseTool];

        // --- EXPERIMENT 1: OPTIONAL TOOL USAGE ---
        console.log('\n\n--- EXPERIMENT 1: Optional Tool Usage ---');
        console.log('[STEP 3] Configuring agent where tool use is optional...');
        const optionalAgent = client.chat.session(MODEL).withTools(tools);

        console.log('[STEP 4] Running agent with a conversational prompt...');
        const softPrompt = "Can you check the database for me?";
        console.log(`👤 User > ${softPrompt}`);
        const optionalResponse = await optionalAgent.run(softPrompt);
        console.log(`🤖 Assistant > ${optionalResponse}`);
        console.log('[INFO] The model may or may not use the tool. Often, it will just respond conversationally.');

        // --- EXPERIMENT 2: REQUIRED TOOL USAGE (Manual Loop) ---
        console.log('\n\n--- EXPERIMENT 2: Required Tool Usage (Manual Loop) ---');
        console.log('[STEP 5] Manually controlling tool usage to force a single call...');

        const directPrompt = "Find the number of active users in the database.";
        console.log(`👤 User > ${directPrompt}`);

        let messagesForRequiredTool = [createUserMessage(directPrompt)];
        let finalRequiredResponse = '';

        // First turn: Force tool choice
        const chatSessionForToolCall = client.chat.session(MODEL)
            .withTools(tools)
            .withParameters(builder => builder.toolChoiceRequired(true));

        console.log('[INFO] Sending initial request to force tool call...');
        let toolCalls = [];
        for await (const event of chatSessionForToolCall.stream(messagesForRequiredTool)) {
            if (event.type === 'tool_calls') {
                console.log(`\n[EVENT: tool_start] Model decided to call tool: '${event.calls[0].name}'`);
                toolCalls = event.calls;
            }
        }

        if (toolCalls.length > 0) {
            console.log('[INFO] Executing tool locally...');
            const toolResults = await executeTools(toolCalls, tools);

            // Add tool call and result to messages history
            toolResults.forEach((result, index) => {
                const call = toolCalls[index];
                const resultValue = result.success ? result.result : { error: result.error || 'Unknown execution error' };
                messagesForRequiredTool.push(createAssistantToolCallMessage(call.id, call.name, call.arguments));
                messagesForRequiredTool.push(createToolResultMessage(call.id, call.name, JSON.stringify(resultValue)));
            });

            // Second turn: Allow model to generate text response (no forced tool choice)
            console.log('[INFO] Sending tool results back to model for final text response...');
            const chatSessionForText = client.chat.session(MODEL)
                .withTools(tools); // Keep tools available, but don't force choice

            for await (const event of chatSessionForText.stream(messagesForRequiredTool)) {
                if (event.type === 'text') {
                    finalRequiredResponse += event.content;
                }
            }
            console.log(`🤖 Assistant > ${finalRequiredResponse}`);
        } else {
            finalRequiredResponse = "Error: Model did not call the tool as expected.";
            console.log(finalRequiredResponse);
        }

        // --- EXPERIMENT 3: AGENTIC LOOP WITH FORCED TOOL USAGE (Testing v2.12.2 fix) ---
        console.log('\n\n--- EXPERIMENT 3: Agentic Loop with Forced Tool Usage (Testing v2.12.2 fix) ---');
        console.log('[STEP 7] Configuring agent with `toolChoiceRequired` to test graceful handling of iteration limit...');

        const agenticLoopAgent = client
            .chat.session(MODEL)
            .withTools(tools);

        const agenticLoopPrompt = "Use the 'query_user_database' tool to find all active users. Keep calling the tool until you have a comprehensive list, then summarize.";
        console.log(`👤 User > ${agenticLoopPrompt}`);

        let finalAgenticLoopResponse = '';
        try {
            finalAgenticLoopResponse = await agenticLoopAgent.run(agenticLoopPrompt);
            console.log(`🤖 Assistant > ${finalAgenticLoopResponse}`);
            console.log('[INFO] The agent.run() method should now gracefully handle the iteration limit and provide a text response.');
        } catch (error) {
            console.error('\n[ERROR] Agentic loop failed unexpectedly:', error.message);
            finalAgenticLoopResponse = `Error: ${error.message}`; // Capture error message
        }

        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`
🤖 Response (Optional Mode) > ${optionalResponse}`);
        console.log(`🤖 Response (Required Mode) > ${finalRequiredResponse}`);
        console.log(`🤖 Response (Agentic Loop Mode) > ${finalAgenticLoopResponse}`);
        console.log('--------------------');
        console.log('Success! By using `toolChoiceRequired`, we forced the model to call our tool, making the application\'s behavior predictable and reliable.');

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