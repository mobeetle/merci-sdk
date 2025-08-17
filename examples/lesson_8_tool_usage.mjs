// lesson_8_tool_usage.mjs
// Merci SDK Tutorial: Lesson 8 - Basic Tool Usage

// --- IMPORTS ---
// For the high-level .run() agent, we only need the client and token.
// The SDK handles the creation of tool messages internally.
import { MerciClient, createUserMessage } from '../lib/merci.2.11.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION ---
// A simple, reusable tool for this lesson.
const weatherTool = {
    name: 'get_current_weather',
    description: 'Get the current weather for a specified city.',
    parameters: {
        type: 'object',
        properties: {
            city: { type: 'string', description: 'The city name, e.g., "San Francisco".' }
        },
        required: ['city'],
    },
    execute: async ({ city }) => {
        console.log(`[TOOL EXECUTING] Getting weather for ${city}...`);
        const temperatures = {
            'tokyo': { temperature: '15', unit: 'celsius', forecast: 'clear skies' },
            'london': { temperature: '12', unit: 'celsius', forecast: 'cloudy' },
            'paris': { temperature: '14', unit: 'celsius', forecast: 'sunny' },
        };
        const result = temperatures[city.toLowerCase()] || { error: 'City not found' };
        console.log(`[TOOL RESULT] For ${city}:`, result);
        return result;
    },
};

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 8 - Basic Tool Usage (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        // We add event listeners for observability to see the agent's actions.
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });
        client.on('tool_start', ({ calls }) => console.log(`\n[EVENT: tool_start] Model requested to call '${calls[0].name}'.`));
        client.on('tool_finish', ({ results }) => console.log(`[EVENT: tool_finish] Finished executing tool.`));

        // --- STEP 2: DEFINE PROMPT AND TOOLS ---
        // The prompt should require the model to use the provided tool.
        console.log('[STEP 2] Preparing prompt and tool definition...');
        const userPrompt = "What's the weather like in Paris?";
        const tools = [weatherTool];

        // --- STEP 3: CONFIGURE THE AGENT ---
        // This is the core of the lesson. We create an "agent" by equipping
        // a chat session with our tool(s).
        console.log('[STEP 3] Configuring the agent with the weather tool...');
        const agent = client
            .chat(MODEL)
            .withTools(tools);

        // --- STEPS 4 & 5: RUN THE AGENT ---
        // The `.run()` method handles the entire multi-step process automatically.
        console.log('[STEP 4] Running the agent to get the final answer...');
        console.log(`\n👤 User > ${userPrompt}`);
        const finalAnswer = await agent.run(userPrompt);

        // --- STEP 6: DISPLAY THE FINAL OUTPUT ---
        // The `finalAnswer` is the LLM's natural language response based on the tool output.
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Assistant > ${finalAnswer}`);
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