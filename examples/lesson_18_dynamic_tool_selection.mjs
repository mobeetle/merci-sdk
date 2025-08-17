// lesson_18_dynamic_tool_selection.mjs
// Merci SDK Tutorial: Lesson 18 - Dynamic Tool Selection for Context-Aware Agents

// --- IMPORTS ---
import { MerciClient } from '../lib/merci.2.11.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- STEP 1: CREATE A COMPREHENSIVE TOOL LIBRARY ---
// In a real application, these would be in separate modules.
const toolLibrary = {
    calendar: [{
        name: 'create_event',
        description: 'Create a calendar event.',
        parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
        execute: async ({ title }) => ({ status: `event '${title}' created` }),
    }],
    email: [{
        name: 'send_email',
        description: 'Send an email.',
        parameters: { type: 'object', properties: { recipient: { type: 'string' } }, required: ['recipient'] },
        execute: async ({ recipient }) => ({ status: `email sent to ${recipient}` }),
    }],
    database: [{
        name: 'query_users',
        description: 'Query the user database.',
        parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
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
        const userPrompt = "Can you query the database for all active users?";

        // --- STEP 5: DYNAMICALLY SELECT TOOLS BASED ON THE PROMPT ---
        // This is the core of the lesson. The router runs *before* we configure the agent.
        const relevantTools = selectToolsForPrompt(userPrompt);

        // --- STEP 6: CONFIGURE THE AGENT WITH THE SELECTED TOOLS ---
        console.log('\n[STEP 6] Configuring the agent with ONLY the relevant tools...');
        const agent = client.chat(MODEL).withTools(relevantTools);

        // --- STEP 7: RUN THE AGENT ---
        console.log('[STEP 7] Running the context-aware agent...');
        console.log(`\n👤 User > ${userPrompt}`);
        const finalAnswer = await agent.run(userPrompt);

        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Assistant > ${finalAnswer}`);
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