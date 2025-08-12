// lesson_1_basic_usage.mjs
// Merci SDK Tutorial: Lesson 1 - Basic Usage & Your First API Call

// --- IMPORTS ---
// We import the main client and a helper function for creating messages.
import { MerciClient, createUserMessage } from '../lib/merci.2.11.0.mjs';
import { token } from "../secret/token.mjs"; // Your JWT is securely imported.

// --- CONSTANTS ---
// Centralize the model name for easy changes.
const MODEL = 'google-chat-gemini-flash-2.5';

/**
 * The main entry point for our first example.
 * Using an async function allows us to leverage top-level await for clean, readable code.
 */
async function main() {
    // Each lesson has a clear title.
    console.log(`--- Merci SDK Tutorial: Lesson 1 - Basic Usage (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        // This is the gateway to the JetBrains AI platform. It's the same for all lessons.
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: DEFINE PROMPT AND INPUT DATA ---
        // This is the core instruction for the Large Language Model (LLM).
        console.log('[STEP 2] Preparing prompt and input data...');
        const userPrompt = "Write a short, inspiring tagline for a new coffee brand called 'Stardust Brew'.";

        // --- STEP 3: CONFIGURE THE CHAT SESSION ---
        // For this basic lesson, we only need to select the model profile.
        // No extra configuration (.withTools(), .withSystemMessage(), etc.) is needed.
        console.log('[STEP 3] Configuring the chat session...');
        const chatSession = client.chat(MODEL);

        // --- STEP 4: PREPARE THE MESSAGE PAYLOAD ---
        // The SDK expects an array of message objects. We use the `createUserMessage`
        // helper to structure our prompt correctly.
        console.log('[STEP 4] Creating the message payload...');
        const messages = [
            createUserMessage(userPrompt),
        ];

        // --- STEP 5: EXECUTE THE REQUEST & PROCESS THE RESPONSE ---
        // We use a streaming approach for real-time output. The `stream()` method
        // returns an async iterator, which is the standard way to handle responses.
        console.log('[STEP 5] Sending request and processing stream...');
        let finalResponse = '';
        process.stdout.write('🤖 Assistant > ');

        for await (const event of chatSession.stream(messages)) {
            // The stream yields structured events. For basic chat, we are interested
            // in events of `type: 'text'`.
            if (event.type === 'text') {
                process.stdout.write(event.content); // For a live-typing effect
                finalResponse += event.content;
            }
        }
        process.stdout.write('\n'); // Newline after the full response
        console.log('\n[INFO] Stream finished. Response fully received.');

        // --- STEP 6: DISPLAY THE FINAL OUTPUT ---
        // A clear summary of the interaction.
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Assistant > ${finalResponse}`);
        console.log('--------------------');

    } catch (error) {
        // --- ROBUST ERROR HANDLING ---
        // This block is crucial for debugging and production stability.
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

// --- EXECUTION ---
// The .catch() ensures any unhandled promise rejections from main() are caught.
main().catch(console.error);