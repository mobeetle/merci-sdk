// lesson_3_model_selection.mjs
// Merci SDK Tutorial: Lesson 3 - Model Selection

// --- IMPORTS ---
import { MerciClient, createUserMessage } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const MODELS_TO_TEST = [
    'google-chat-gemini-flash-2.5',
    'openai-gpt-5-mini',
    'anthropic-claude-3.5-haiku'
];

async function runModelExperiment(client, modelName, prompt) {
    console.log(`\n--- Experiment: Running prompt with ${modelName} ---`);
    const chatSession = client.chat.session(modelName);
    const messages = [ createUserMessage(prompt) ];
    let finalResponse = '';
    process.stdout.write(`🤖 ${modelName} > `);

    for await (const event of chatSession.stream(messages)) {
        if (event.type === 'text') {
            process.stdout.write(event.content);
            finalResponse += event.content;
        }
    }
    process.stdout.write('\n');
    console.log(`\n[INFO] Stream finished for ${modelName}.`);
    return finalResponse;
}

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 3 - Model Selection ---`);
    try {
        console.log('\n[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        console.log('[STEP 2] Preparing a single prompt for all models...');
        const userPrompt = "Explain the concept of 'deja vu' in a single, creative sentence.";
        console.log(`   Prompt: "${userPrompt}"`);

        console.log('\n[STEP 3] Running experiments for each model...');
        const results = [];
        for (const model of MODELS_TO_TEST) {
            const response = await runModelExperiment(client, model, userPrompt);
            results.push({ model, response });
        }

        console.log('\n\n--- FINAL RESULT ---');
        console.log(`👤 User Prompt > ${userPrompt}`);
        console.log('--------------------------');
        for (const result of results) {
            console.log(`🤖 ${result.model}:`);
            console.log(`   ${result.response || "No response received."}\n`);
        }
        console.log('--------------------------');
        console.log('Notice the differences in tone, style, and vocabulary between the models!');
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
        process.exit(1);
    }
}

main().catch(console.error);