// lesson_6_parameter_control.mjs
// Merci SDK Tutorial: Lesson 6 - The Parameter Builder Pattern

// --- IMPORTS ---
import { MerciClient, createUserMessage } from './merci.2.11.0.mjs';
import { token } from "./token.mjs";

// --- CONSTANTS ---
const MODEL = 'google-chat-gemini-flash-2.5';

/**
 * A reusable helper function to run a chat experiment with specific parameters.
 * @param {MerciClient} client - The initialized Merci client.
 * @param {string} prompt - The user prompt.
 * @param {(builder: import('./merci.2.11.0.mjs').ParameterBuilder) => any} builderFn - A function that configures the ParameterBuilder.
 * @param {string} description - A description of the experiment.
 */
async function runExperiment(client, prompt, builderFn, description) {
    console.log(`\n--- Experiment: ${description} ---`);

    // STEP 3: Configure the session with parameters using the builder pattern.
    const chatSession = client.chat(MODEL).withParameters(builderFn);
    // STEP 4: Prepare the message payload.
    const messages = [createUserMessage(prompt)];

    let finalResponse = '';
    process.stdout.write('🤖 Assistant > ');
    // STEP 5: Execute and process the stream.
    for await (const event of chatSession.stream(messages)) {
        if (event.type === 'text') {
            process.stdout.write(event.content);
            finalResponse += event.content;
        }
    }
    process.stdout.write('\n');
    return finalResponse;
}

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 6 - Parameter Control (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        const client = new MerciClient({ token });
        client.on('parameter_warning', (warning) => {
            console.warn(`\n[SDK WARNING] ${warning.message}`);
        });

        // --- STEP 2: DEFINE PROMPT AND INPUT DATA ---
        const storyPrompt = "Tell me a very short story about a robot who discovers music.";
        const jsonPrompt = "Extract the name, age, and city from this text: 'Anna is 32 and lives in Paris.' into a JSON object.";

        // --- EXPERIMENT 1: Focused and Deterministic Output ---
        await runExperiment(
            client,
            storyPrompt,
            builder => builder.temperature(0.1),
            'Focused and Deterministic (Low Temperature)'
        );

        // --- EXPERIMENT 2: Creative and Unpredictable ---
        await runExperiment(
            client,
            storyPrompt,
            builder => builder.temperature(1.0).topP(0.9),
            'Creative and Unpredictable (High Temperature, High Top-P)'
        );

        // --- EXPERIMENT 3: Forcing JSON Output ---
        await runExperiment(
            client,
            jsonPrompt,
            builder => builder.asJson(),
            'Forcing JSON Output'
        );

        // --- EXPERIMENT 4: Demonstrating an Unsupported Parameter ---
        // The 'seed' parameter is not supported by this Gemini model.
        // The SDK is smart enough to detect this, emit a warning, and filter it out.
        await runExperiment(
            client,
            storyPrompt,
            builder => builder.temperature(0.5).seed(12345),
            'Using an Unsupported Parameter (Seed)'
        );

    } catch (error) {
        // --- ROBUST ERROR HANDLING ---
        console.error('\n\n[FATAL ERROR] An error occurred during the operation.');
        console.error('  Message:', error.message);
        if (error.status) { console.error('  API Status:', error.status); }
        if (error.details) { console.error('  Details:', JSON.stringify(error.details, null, 2)); }
        process.exit(1);
    }
}

// --- EXECUTION ---
main().catch(console.error);