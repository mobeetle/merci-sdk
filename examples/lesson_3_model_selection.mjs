// lesson_3_model_selection.mjs
// Merci SDK Tutorial: Lesson 3 - Model Selection

// --- IMPORTS ---
// We only need the basic client and message helpers for this lesson.
import { MerciClient, createUserMessage } from '../lib/merci.2.11.0.mjs';
import { token } from '../secret/token.mjs';

const MODELS_TO_TEST = [
    'google-chat-gemini-flash-2.5',
    'openai-gpt-5-mini',
    'anthropic-claude-3.5-haiku'
];


/**
 * A reusable helper function to run a chat request against a specific model.
 * This keeps our main loop clean and readable.
 * @param {MerciClient} client - The initialized Merci client.
 * @param {string} modelName - The model profile to use for this request.
 * @param {string} prompt - The user prompt to send to the model.
 */
async function runModelExperiment(client, modelName, prompt) {
    console.log(`\n--- Experiment: Running prompt with ${modelName} ---`);

    try {
        // STEPS 3 & 4: Configure the session and prepare the message payload.
        const chatSession = client.chat(modelName);
        const messages = [createUserMessage(prompt)];

        // STEP 5: Execute the request and process the response.
        let finalResponse = '';
        process.stdout.write(`🤖 ${modelName} > `);

        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                process.stdout.write(event.content);
                finalResponse += event.content;
            }
        }
        process.stdout.write('\n'); // Final newline for this model's response.
        return finalResponse;

    } catch (error) {
        console.error(`\n[ERROR] Failed to get response from ${modelName}.`);
        console.error('  Message:', error.message);
        if (error.status) {
            console.error('  API Status:', error.status);
        }
    }
}


async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 3 - Model Selection ---`);

    // --- STEP 1: INITIALIZE THE CLIENT ---
    console.log('\n[STEP 1] Initializing MerciClient...');
    const client = new MerciClient({ token });

    // --- STEP 2: DEFINE PROMPT AND INPUT DATA ---
    // We'll use a single, creative prompt to highlight the differences between models.
    console.log('[STEP 2] Preparing a single prompt for all models...');
    const userPrompt = "Explain the concept of 'deja vu' in a single, creative sentence.";
    console.log(`   Prompt: "${userPrompt}"`);


    // --- STEPS 3-5 are handled inside the loop by our helper function ---
    console.log('\n[STEP 3] Running experiments for each model...');
    const results = [];
    for (const model of MODELS_TO_TEST) {
        const response = await runModelExperiment(client, model, userPrompt);
        results.push({ model, response });
    }


    // --- STEP 6: DISPLAY THE FINAL OUTPUT ---
    // A clear, comparative summary of all interactions.
    console.log('\n\n--- FINAL COMPARISON ---');
    console.log(`👤 User Prompt > ${userPrompt}`);
    console.log('--------------------------');
    for (const result of results) {
        console.log(`🤖 ${result.model}:`);
        console.log(`   ${result.response || "No response received."}\n`);
    }
    console.log('--------------------------');
    console.log('Notice the differences in tone, style, and vocabulary between the models!');

}

main().catch(console.error);