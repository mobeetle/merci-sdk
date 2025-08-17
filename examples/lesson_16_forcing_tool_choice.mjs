// lesson_16_forcing_tool_choice.mjs
// Merci SDK Tutorial: Lesson 16 - Forcing Tool Usage with `toolChoiceRequired`

// --- IMPORTS ---
import { MerciClient } from '../lib/merci.2.11.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION ---
// We'll use a single, clear tool for this demonstration.
const databaseTool = {
    name: 'query_user_database',
    description: 'Runs a query against the user database.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'The database query to execute.' }
        },
        required: ['query']
    },
    execute: async ({ query }) => {
        console.log(`\n[TOOL EXECUTING] Running query: "${query}"`);
        if (query.includes('active')) {
            return { status: 'success', row_count: 157, results: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] };
        }
        return { status: 'success', row_count: 0, results: [] };
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
        const optionalAgent = client.chat(MODEL).withTools(tools);

        console.log('[STEP 4] Running agent with a conversational prompt...');
        const softPrompt = "Can you check the database for me?";
        console.log(`👤 User > ${softPrompt}`);
        const optionalResponse = await optionalAgent.run(softPrompt);
        console.log(`🤖 Assistant > ${optionalResponse}`);
        console.log('[INFO] The model may or may not use the tool. Often, it will just respond conversationally.');

        // --- EXPERIMENT 2: REQUIRED TOOL USAGE ---
        console.log('\n\n--- EXPERIMENT 2: Required Tool Usage ---');
        console.log('[STEP 5] Configuring agent with `toolChoiceRequired` to force tool usage...');
        const requiredAgent = client
            .chat(MODEL)
            .withTools(tools)
            .withParameters(builder => builder.toolChoiceRequired(true)); // The key parameter

        console.log('[STEP 6] Running agent with a direct command...');
        const directPrompt = "Find all active users in the database.";
        console.log(`👤 User > ${directPrompt}`);
        const requiredResponse = await requiredAgent.run(directPrompt);

        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`\n🤖 Response (Optional Mode) > ${optionalResponse}`);
        console.log(`🤖 Response (Required Mode) > ${requiredResponse}`);
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