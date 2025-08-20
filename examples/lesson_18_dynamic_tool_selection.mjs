// lesson_18_dynamic_tool_selection.mjs
// Merci SDK Tutorial: Lesson 18 - Dynamic Tool Selection for Context-Aware Agents

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

// --- STEP 1: CREATE A COMPREHENSIVE TOOL LIBRARY ---
// In a real application, these would be in separate modules.
const toolLibrary = {
    calendar: [{
        name: 'create_event',
        parameters: { schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } },
        execute: async ({ title }) => ({ status: `event '${title}' created` }),
    }],
    email: [{
        name: 'send_email',
        parameters: { schema: { type: 'object', properties: { recipient: { type: 'string' } }, required: ['recipient'] } },
        execute: async ({ recipient }) => ({ status: `email sent to ${recipient}` }),
    }],
    database: [{
        name: 'query_users',
        parameters: { schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
        execute: async ({ query }) => ({ results: [{ id: 1, name: 'Alice' }] }),
    }],
};

// --- STEP 2: CREATE A "ROUTER" TO SELECT RELEVANT TOOLS ---
/**
 * Analyzes a prompt and returns a subset of tools relevant to the user's request.
 * @param {string} prompt The user's input.
 * @returns {Array<object>} An array of tool definitions.
 */
function selectToolsForPrompt(prompt) {
    console.log('\n[ROUTER] Analyzing prompt to select relevant tools...');
    const selectedTools = [];
    const lowerCasePrompt = prompt.toLowerCase();

    if (lowerCasePrompt.includes('meeting') || lowerCasePrompt.includes('schedule') || lowerCasePrompt.includes('event')) {
        selectedTools.push(...toolLibrary.calendar);
    }
    if (lowerCasePrompt.includes('email') || lowerCasePrompt.includes('send')) {
        selectedTools.push(...toolLibrary.email);
    }
    if (lowerCasePrompt.includes('database') || lowerCasePrompt.includes('users') || lowerCasePrompt.includes('query')) {
        selectedTools.push(...toolLibrary.database);
    }

    if (selectedTools.length === 0) {
        console.log('[ROUTER] No specific tools matched. Proceeding without tools.');
        return [];
    }

    console.log(`[ROUTER] Selected tools: [${selectedTools.map(t => t.name).join(', ')}]`);
    return selectedTools;
}


async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 18 - Dynamic Tool Selection (Model: ${MODEL}) ---`);

    try {
        // --- STEP 3: INITIALIZE THE CLIENT ---
        console.log('\n[STEP 3] Initializing MerciClient...');
        const client = new MerciClient({ token });
        client.on('tool_start', ({ calls }) => {
            console.log(`\n[EVENT: tool_start] Model is calling the dynamically selected tool: '${calls[0].name}'`);
        });

        // --- STEP 4: DEFINE PROMPT ---
        console.log('[STEP 4] Preparing user prompt...');
        const userPrompt = "Use the 'query_users' tool to find all active users in the database. Once you have the results, provide a concise summary of the active users found.";

        // --- STEP 5: DYNAMICALLY SELECT TOOLS BASED ON THE PROMPT ---
        // This is the core of the lesson. The router runs *before* we configure the agent.
        const relevantTools = selectToolsForPrompt(userPrompt);

        // --- STEP 6: CONFIGURE THE AGENT WITH THE SELECTED TOOLS ---
        console.log('\n[STEP 6] Configuring the agent with ONLY the relevant tools...');
        const agent = client.chat.session(MODEL).withTools(relevantTools);

        // --- STEP 7: RUN THE AGENT (Manual Loop) ---
        console.log('[STEP 7] Running the context-aware agent (manual loop)...');
        console.log(`\n👤 User > ${userPrompt}`);

        let messagesForToolCall = [createUserMessage(userPrompt)];
        let finalAnswer = '';

        // First turn: Force tool choice if relevantTools are found
        const chatSessionForToolCall = client.chat.session(MODEL)
            .withTools(relevantTools)
            .withParameters(builder => {
                if (relevantTools.length > 0) {
                    builder.toolChoiceRequired(true);
                }
                return builder; // Explicitly return the builder
            });

        console.log('[INFO] Sending initial request to potentially force tool call...');
        let toolCalls = [];
        for await (const event of chatSessionForToolCall.stream(messagesForToolCall)) {
            if (event.type === 'tool_calls') {
                console.log(`\n[EVENT: tool_start] Model decided to call tool: '${event.calls[0].name}'`);
                toolCalls = event.calls;
            }
        }

        if (toolCalls.length > 0) {
            console.log('[INFO] Executing tool locally...');
            const toolResults = await executeTools(toolCalls, relevantTools);

            // Add tool call and result to messages history
            toolResults.forEach((result, index) => {
                const call = toolCalls[index];
                const resultValue = result.success ? result.result : { error: result.error || 'Unknown execution error' };
                messagesForToolCall.push(createAssistantToolCallMessage(call.id, call.name, call.arguments));
                messagesForToolCall.push(createToolResultMessage(call.id, call.name, JSON.stringify(resultValue)));
            });

            // Second turn: Allow model to generate text response (no forced tool choice)
            console.log('[INFO] Sending tool results back to model for final text response...');
            const chatSessionForText = client.chat.session(MODEL)
                .withTools(relevantTools); // Keep tools available, but don't force choice

            for await (const event of chatSessionForText.stream(messagesForToolCall)) {
                if (event.type === 'text') {
                    finalAnswer += event.content;
                }
            }
        } else {
            // If no tool calls were made (e.g., no relevant tools or model chose not to use tool in optional mode)
            // We need to get the direct text response from the first turn.
            const chatSessionForText = client.chat.session(MODEL).withTools(relevantTools);
            for await (const event of chatSessionForText.stream(messagesForToolCall)) {
                if (event.type === 'text') {
                    finalAnswer += event.content;
                }
            }
        }

        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`👤 User > ${userPrompt}`);
        console.log('--------------------');
        console.log('The agent successfully used the `query_users` tool because the router identified it as relevant, while ignoring the irrelevant email and calendar tools.');

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