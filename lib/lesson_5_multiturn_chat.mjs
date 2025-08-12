// lesson_5_multiturn_chat.mjs
// Merci SDK Tutorial: Lesson 5 - Interactive Multi-Turn Chat

// --- IMPORTS ---
// We need message helpers for both user and assistant roles.
import { MerciClient, createUserMessage, createAssistantTextMessage } from './merci.2.11.0.mjs';
import { token } from "./token.mjs";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// --- CONSTANTS ---
const MODEL = 'google-chat-gemini-flash-2.5';

/**
 * The main function to run the interactive chat application.
 */
async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 5 - Multi-Turn Chat (Model: ${MODEL}) ---`);
    console.log("Type 'exit' or 'quit' to end the conversation.\n");

    const rl = readline.createInterface({ input, output });
    // The `messages` array is the heart of a multi-turn chat.
    // It acts as the conversation's memory.
    const messages = [];

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        const client = new MerciClient({ token });
        client.on('error', (error) => console.error(`\n[SDK Internal Error]`, error.message));

        // --- STEP 3: CONFIGURE THE CHAT SESSION ---
        // The session is created once and reused for the entire conversation.
        const chatSession = client.chat(MODEL);

        // --- STEPS 2, 4, 5 are inside the loop (REPL: Read-Eval-Print Loop) ---
        while (true) {
            // STEP 2 (Loop): Get user input.
            const userInput = await rl.question('👤 You > ');

            if (['exit', 'quit'].includes(userInput.toLowerCase())) {
                break;
            }

            // STEP 4 (Loop): Add the user's new message to our conversation history.
            messages.push(createUserMessage(userInput));

            let assistantResponse = '';
            process.stdout.write('🤖 Assistant > ');

            // STEP 5 (Loop): Execute the request with the *entire message history*.
            // This is how the LLM receives the full context of the conversation.
            const stream = chatSession.stream(messages);

            for await (const event of stream) {
                if (event.type === 'text') {
                    process.stdout.write(event.content);
                    assistantResponse += event.content;
                }
            }
            process.stdout.write('\n');

            // CRITICAL STEP: Add the assistant's complete response to the history.
            // Forgetting this step would mean the model has amnesia about its own replies.
            if (assistantResponse) {
                messages.push(createAssistantTextMessage(assistantResponse));
            }
        }
    } catch (error) {
        // --- ROBUST ERROR HANDLING ---
        console.error('\n\n[FATAL ERROR] The chat session has crashed.');
        console.error('  Message:', error.message);
        if (error.stack) { console.error('  Stack:', error.stack); }
    } finally {
        // --- GRACEFUL CLEANUP ---
        console.log('\nConversation ended. Goodbye!');
        rl.close();
    }
}

// --- EXECUTION ---
main().catch(console.error);