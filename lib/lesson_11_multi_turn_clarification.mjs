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
} from './merci.2.11.0.mjs';
import { token } from "./token.mjs";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// --- CONSTANTS ---
const MODEL = 'google-chat-gemini-flash-2.5';

// --- TOOL DEFINITION ---
const calendarTool = {
    name: 'create_calendar_event',
    description: 'Schedules a new event in the user\'s calendar.',
    parameters: { /* ... (omitted for brevity, same as original) ... */ },
    execute: async ({ title, date, time, duration_minutes }) => {
        console.log(`\n[TOOL EXECUTE] ✅ Success! Creating event: "${title}" on ${date} at ${time} for ${duration_minutes} minutes.`);
        return { status: 'success', eventId: `evt_${Date.now()}` };
    },
};
const fullCalendarTool = { name: 'create_calendar_event', description: 'Schedules a new event in the user\'s calendar.', parameters: { type: 'object', properties: { title: { type: 'string', description: 'The title of the event.' }, date: { type: 'string', description: 'The date of the event in YYYY-MM-DD format.' }, time: { type: 'string', description: 'The start time of the event (accept all formats and infer the correct time).' }, duration_minutes: { type: 'number', description: 'The duration of the event in minutes.' }, }, required: ['title', 'date', 'time', 'duration_minutes'], }, execute: async ({ title, date, time, duration_minutes }) => { console.log(`\n[TOOL EXECUTE] ✅ Success! Creating event: "${title}" on ${date} at ${time} for ${duration_minutes} minutes.`); return { status: 'success', eventId: `evt_${Date.now()}` }; }, };


async function main() {
    console.log(`--- Merci SDK Lesson 11: Multi-Turn Tool Clarification (Model: ${MODEL}) ---`);
    console.log("Type 'exit' or 'quit' to end the conversation.\n");

    const rl = readline.createInterface({ input, output });
    const messages = [];

    try {
        // --- STEP 1 & 3: INITIALIZE CLIENT AND CONFIGURE SESSION ---
        const client = new MerciClient({ token });
        const chatSession = client.chat(MODEL).withTools([fullCalendarTool]);

        // --- INTERACTIVE LOOP (STEPS 2, 4, 5) ---
        let userInput = "Can you add an event to my calendar?"; // Initial prompt
        console.log(`👤 You > ${userInput}`);

        while (true) {
            if (userInput) {
                messages.push(createUserMessage(userInput));
            }

            let toolCalls = [];
            let currentTurnText = '';
            process.stdout.write('🤖 Assistant > ');

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

            if (currentTurnText) {
                messages.push(createAssistantTextMessage(currentTurnText));
            }

            if (toolCalls.length > 0) {
                const toolResults = await executeTools(toolCalls, [fullCalendarTool]);
                toolResults.forEach((result, index) => {
                    const call = toolCalls[index];
                    const resultValue = result.success ? result.result : { error: result.error };
                    messages.push(createAssistantToolCallMessage(call.id, call.name, call.arguments));
                    messages.push(createToolResultMessage(call.id, call.name, JSON.stringify(resultValue)));
                });
                userInput = null; // Loop immediately to get the model's summary.
                continue;
            }

            userInput = await rl.question('\n👤 You > ');
            if (['exit', 'quit'].includes(userInput.toLowerCase())) {
                break;
            }
        }
    } catch (error) {
        // --- ROBUST ERROR HANDLING ---
        console.error('\n[FATAL ERROR] The chat session has crashed:', error);
    } finally {
        console.log('\nConversation ended. Goodbye!');
        rl.close();
    }
}

// --- EXECUTION ---
main().catch(console.error);