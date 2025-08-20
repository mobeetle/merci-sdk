// lesson_5_multiturn_chat.mjs
// Merci SDK Tutorial: Lesson 5 - Interactive Multi-Turn Chat

// --- IMPORTS ---
// We need message helpers for both user and assistant roles.
import { MerciClient, createAssistantTextMessage, createUserMessage } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const MODEL = 'google-chat-gemini-flash-2.5';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 5 - Multi-Turn Chat (Model: ${MODEL}) ---`);
    console.log("Type 'exit' or 'quit' to end the conversation.\n");

    const rl = readline.createInterface({ input, output });
    // The `messages` array is the heart of a multi-turn chat.
    // It acts as the conversation's memory.
    const messages = [];

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });
        client.on('error', (error) => console.error(`\n[SDK Internal Error]`, error.message));

        // --- STEP 2: CONFIGURE THE CHAT SESSION ---
        // The session is created once and reused for the entire conversation.
        console.log('[STEP 2] Configuring the chat session...');
        const chatSession = client.chat.session(MODEL);

        // --- STEPS 3-5 are inside the loop (REPL: Read-Eval-Print Loop) ---
        while (true) {
            // STEP 3 (Loop): Get user input.
            const userInput = await rl.question('👤 You > ');

            if (['exit', 'quit'].includes(userInput.toLowerCase())) {
                console.log('\n[INFO] Conversation ended by user.');
                break;
            }

            // STEP 4 (Loop): Add the user's new message to our conversation history.
            console.log('[STEP 4] Adding user message to history...');
            messages.push(createUserMessage(userInput));

            let assistantResponse = '';
            process.stdout.write('🤖 Assistant > ');

            // STEP 5 (Loop): Execute the request with the *entire message history*.
            // This is how the LLM receives the full context of the conversation.
            console.log('[STEP 5] Sending request with full history and processing stream...');
            const stream = chatSession.stream(messages);

            for await (const event of stream) {
                if (event.type === 'text') {
                    process.stdout.write(event.content);
                    assistantResponse += event.content;
                }
            }
            process.stdout.write('\n');
            console.log('\n[INFO] Stream finished. Response fully received.');

            // CRITICAL STEP: Add the assistant's complete response to the history.
            // Forgetting this step would mean the model has amnesia about its own replies.
            if (assistantResponse) {
                console.log('[INFO] Adding assistant response to history...');
                messages.push(createAssistantTextMessage(assistantResponse));
            }
        }
    } catch (error) {
        // --- ROBUST ERROR HANDLING ---
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
    } finally {
        // --- GRACEFUL CLEANUP ---
        console.log('\n[INFO] Conversation ended. Goodbye!');
        rl.close();
    }
}

main().catch(console.error);