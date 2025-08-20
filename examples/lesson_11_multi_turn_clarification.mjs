// lesson_11_multi_turn_clarification.mjs
// Merci SDK Tutorial: Lesson 11 (Advanced) - Multi-Turn Tool Use & Clarification

// --- IMPORTS ---
import {
    MerciClient,
    executeTools,
    createAssistantToolCallMessage,
    createToolResultMessage,
    createUserMessage,
    createAssistantTextMessage
} from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION ---
const calendarTool = {
    name: 'create_calendar_event',
    parameters: {
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'The title of the event.' },
                date: { type: 'string', description: 'The date of the event in YYYY-MM-DD format.' },
                time: { type: 'string', description: 'The start time of the event (e.g., "14:30").' },
                duration_minutes: { type: 'number', description: 'The duration of the event in minutes.' },
            },
            required: ['title', 'date', 'time', 'duration_minutes'],
        }
    },
    execute: async ({ title, date, time, duration_minutes }) => {
        console.log(`\n[TOOL EXECUTE] ✅ Success! Creating event: "${title}" on ${date} at ${time} for ${duration_minutes} minutes.`);
        return { status: 'success', eventId: `evt_${Date.now()}` };
    },
};

async function main() {
    console.log(`--- Merci SDK Lesson 11: Multi-Turn Tool Clarification (Model: ${MODEL}) ---`);
    console.log("Type 'exit' or 'quit' to end the conversation.\n");

    const rl = readline.createInterface({ input, output });
    const messages = [];

    try {
        // --- STEP 1: INITIALIZE CLIENT AND CONFIGURE SESSION ---
        console.log('[STEP 1] Initializing client and configuring session...');
        const client = new MerciClient({ token });
        const chatSession = client.chat.session(MODEL).withTools([calendarTool]);

        // --- INTERACTIVE LOOP (STEPS 2, 3, 4, 5) ---
        let userInput = "Can you add an event to my calendar?"; // Initial prompt
        console.log(`\n👤 You > ${userInput}`);

        while (true) {
            // STEP 2 (Loop): Add user message to history
            if (userInput) {
                messages.push(createUserMessage(userInput));
            }

            let toolCalls = [];
            let currentTurnText = '';
            process.stdout.write('🤖 Assistant > ');

            // STEP 3 (Loop): Stream model response
            const stream = chatSession.stream(messages);
            for await (const event of stream) {
                if (event.type === 'text') {
                    process.stdout.write(event.content);
                    currentTurnText += event.content;
                } else if (event.type === 'tool_calls') {
                    toolCalls = event.calls;
                }
            }
            process.stdout.write('\n');

            // STEP 4 (Loop): Add assistant's text response to history
            if (currentTurnText) {
                messages.push(createAssistantTextMessage(currentTurnText));
            }

            // STEP 5 (Loop): Handle tool calls if any
            if (toolCalls.length > 0) {
                const toolResults = await executeTools(toolCalls, [calendarTool]);
                toolResults.forEach((result, index) => {
                    const call = toolCalls[index];
                    const resultValue = result.success ? result.result : { error: result.error };
                    messages.push(createAssistantToolCallMessage(call.id, call.name, call.arguments));
                    messages.push(createToolResultMessage(call.id, call.name, JSON.stringify(resultValue)));
                });
                userInput = null; // Loop immediately to get the model's summary.
                continue;
            }

            // Get next user input
            userInput = await rl.question('👤 You > ');
            if (['exit', 'quit'].includes(userInput.toLowerCase())) {
                break;
            }
        }
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
    } finally {
        console.log('\nConversation ended. Goodbye!');
        rl.close();
    }
}

main().catch(console.error);