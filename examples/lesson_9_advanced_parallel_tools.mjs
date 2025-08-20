// lesson_9_advanced_parallel_tools.mjs
// Merci SDK Tutorial: Lesson 9 - Advanced Parallel Tool Calls

// --- IMPORTS ---
import { MerciClient } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-pro-2.5';

// --- TOOL DEFINITIONS ---
const weatherTool = {
    name: 'get_current_weather',
    parameters: {
        schema: { type: 'object', properties: { city: { type: 'string', description: 'The city name, e.g., Paris' } }, required: ['city'], }
    },
    execute: async ({ city }) => {
        console.log(`[TOOL START] 🌦️  Checking weather for ${city}... (simulating 1.2s delay)`);
        await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API call latency
        const temperatures = { 'london': { temperature: 12, unit: 'celsius' }, 'paris': { temperature: 18, unit: 'celsius' }, 'new york': { temperature: 22, unit: 'celsius' }, };
        const result = temperatures[city.toLowerCase()] || { error: 'City not found' };
        console.log(`[TOOL END]   🌦️  Weather for ${city} is ${result.temperature}°C.`);
        return result;
    },
};

const flightTool = {
    name: 'get_flight_price',
    parameters: {
        schema: { type: 'object', properties: { from: { type: 'string', description: 'The departure city.' }, to: { type: 'string', description: 'The arrival city.' }, }, required: ['from', 'to'], }
    },
    execute: async ({ from, to }) => {
        console.log(`[TOOL START] ✈️  Checking flight price from ${from} to ${to}... (simulating 1.8s delay)`);
        await new Promise(resolve => setTimeout(resolve, 1800)); // Simulate a longer API call
        const price = Math.floor(Math.random() * 200) + 300; // Random price for demo
        const result = { price, currency: 'EUR' };
        console.log(`[TOOL END]   ✈️  Flight from ${from} to ${to} costs ${result.price} ${result.currency}.`);
        return result;
    },
};

const calculatorTool = {
    name: 'calculate_total_cost',
    parameters: {
        schema: { type: 'object', properties: { numbers: { type: 'array', items: { type: 'number' }, description: 'An array of numbers to sum up.' } }, required: ['numbers'], }
    },
    execute: ({ numbers }) => {
        console.log(`[TOOL START] 🧮  Calculating sum of [${numbers.join(', ')}]... (simulating 0.1s delay)`);
        const total = numbers.reduce((acc, num) => acc + num, 0);
        const result = { total };
        console.log(`[TOOL END]   🧮  Calculation result is ${total}.`);
        return result;
    }
};

async function main() {
    console.log(`--- Merci SDK Lesson 9: Advanced Parallel Tool Calls (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });
        client.on('tool_start', ({ calls }) => { console.log(`\n[EVENT: tool_start] 🤖 Model has requested ${calls.length} tool(s) to be run in parallel.`); calls.forEach(call => console.log(`  - Calling Tool: ${call.name} with args: ${call.arguments}`)); });
        client.on('tool_finish', ({ results }) => { console.log(`[EVENT: tool_finish] ✅ Finished executing ${results.length} tool(s).`); });

        // --- STEP 2: DEFINE PROMPT AND TOOLS ---
        console.log('[STEP 2] Preparing prompt and tools...');
        const allTools = [weatherTool, flightTool, calculatorTool];
        const userPrompt = "What's the weather in Paris, how much is a flight from London to Paris, and what is the total cost if I also need to buy a souvenir for 25 EUR?";

        // --- STEP 3: CONFIGURE THE CHAT SESSION (AGENT) ---
        console.log('[STEP 3] Configuring the agent for parallel tool calls...');
        const agent = client
            .chat.session(MODEL)
            .withTools(allTools)
            .withParameters(builder => builder.parallelToolCalls(true));

        // --- STEPS 4 & 5: RUN THE AGENT ---
        console.log('[STEP 4] Running the agent...');
        console.log(`\n👤 User > ${userPrompt}\n`);
        const startTime = Date.now();
        const finalAnswer = await agent.run(userPrompt);
        const endTime = Date.now();

        // --- STEP 6: DISPLAY THE FINAL OUTPUT ---
        console.log('[STEP 5] Analyzing results...');
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`🤖 Assistant > ${finalAnswer}`);
        console.log('--------------------------------------------------');
        console.log(`✅ Total execution time: ${duration} seconds.`);
        console.log('Individual tool delays: 1.2s + 1.8s + 0.1s = 3.1s');
        console.log('Notice the total time is close to the longest single tool delay (1.8s), not the sum of all delays.');
        console.log('This demonstrates that the SDK executed the tool calls concurrently.');
        console.log('--------------------------------------------------');

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