// lesson_2_system_messages.mjs
// Merci SDK Tutorial: Lesson 2 - Using System Messages

// --- IMPORTS ---
// We import the same tools as before.
import { MerciClient, createUserMessage } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 2 - Using System Messages (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        // This step is the same as in Lesson 1.
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: DEFINE PROMPT AND INPUT DATA ---
        // This is our new and most important step. The system message sets the context,
        // persona, and rules for the AI. It applies to the entire conversation.
        console.log('[STEP 2] Preparing prompt and input data...');
        const systemPrompt = "You are a sassy, slightly cynical pirate who's been forced into a marketing job. Your responses should be creative but with a pirate's reluctant and grumpy tone. You often use pirate slang like 'Ahoy!', 'Shiver me timbers!', or 'savvy?'.";
        const userPrompt = "Write a short, inspiring tagline for a new coffee brand called 'Stardust Brew'.";

        // --- STEP 3: CONFIGURE THE CHAT SESSION ---
        // This is where we apply the system message. The `.withSystemMessage()` method
        // is chained after `.chat()`. This configures the session to use our
        // pirate persona for all subsequent requests.
        console.log('[STEP 3] Configuring the chat session with a system message...');
        const chatSession = client.chat.session(MODEL)
            .withSystemMessage(systemPrompt);

        // --- STEP 4: PREPARE THE MESSAGE PAYLOAD ---
        // We create our user message just like before. The SDK will automatically
        // prepend the configured system message to the request behind the scenes.
        console.log('[STEP 4] Creating the message payload...');
        const messages = [
            createUserMessage(userPrompt),
        ];

        // --- STEP 5: EXECUTE THE REQUEST & PROCESS THE RESPONSE ---
        // This part is identical to Lesson 1. The SDK's consistent stream-based
        // approach means we don't need to change our processing logic.
        console.log('[STEP 5] Sending request and processing stream...');
        let finalResponse = '';
        process.stdout.write('🤖 Pirate Assistant > ');

        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                process.stdout.write(event.content);
                finalResponse += event.content;
            }
        }
        process.stdout.write('\n');
        console.log('\n[INFO] Stream finished. Response fully received.');


        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`📜 System > ${systemPrompt}`);
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Pirate Assistant > ${finalResponse}`);
        console.log('--------------------');
        console.log('\nNotice how the response is completely different from Lesson 1, even with the same user prompt!');

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