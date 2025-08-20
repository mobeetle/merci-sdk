// lesson_19_task_api_usage.mjs
// Merci SDK Tutorial: Lesson 19 - Using the Task API

// --- IMPORTS ---
import { MerciClient } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

// A common task ID. We'll fetch the full list to ensure it's available.
const TASK_ID_TO_TEST = 'code-generate:default';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 19 - Using the Task API ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: GET THE ROSTER OF AVAILABLE TASKS ---
        console.log('\n[STEP 2] Fetching the list of available tasks from the roster...');
        const roster = await client.tasks.roster();
        console.log('Available task IDs:', roster.ids);

        if (!roster.ids.includes(TASK_ID_TO_TEST)) {
            console.error(`\n[ERROR] The test task "${TASK_ID_TO_TEST}" is not available in the roster. Please choose another one.`);
            return;
        }
        console.log(`[INFO] Will use "${TASK_ID_TO_TEST}" for demonstration.`);

        // --- STEP 3: DEFINE TASK PARAMETERS ---
        console.log('\n[STEP 3] Defining parameters for the code generation task...');
        const taskParameters = {
            instructions: "Write a simple JavaScript function that returns 'Hello, World!'.",
            language: "javascript",
            prefix: "",
            suffix: ""
        };
        console.log('Parameters:', JSON.stringify(taskParameters, null, 2));

        // --- STEP 4: EXECUTE THE TASK WITH THE STREAMING API ---
        console.log(`\n[STEP 4] Executing task "${TASK_ID_TO_TEST}" with .stream()...`);
        let streamedResponse = '';
        process.stdout.write('🤖 Task Output (Streaming) > ');

        const stream = client.tasks.stream(TASK_ID_TO_TEST, taskParameters);
        for await (const event of stream) {
            if (event.type === 'Content') {
                process.stdout.write(event.content);
                streamedResponse += event.content;
            } else {
                // Log other event types for observability
                console.log(`\n[STREAM EVENT: ${event.type}]`, event.data);
            }
        }
        process.stdout.write('\n');
        console.log('\n[INFO] Stream finished.');

        // --- STEP 5: EXECUTE THE SAME TASK WITH THE BLOCKING API ---
        console.log(`\n[STEP 5] Executing task "${TASK_ID_TO_TEST}" with .execute()...`);
        const result = await client.tasks.execute(TASK_ID_TO_TEST, taskParameters);
        console.log('[INFO] Execution finished. Received aggregated result object.');

        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log('--- Streaming Response ---');
        console.log(streamedResponse);
        console.log('\n--- Aggregated .execute() Response ---');
        console.log('Content:', result.content);
        console.log('Finish Metadata:', result.finishMetadata);
        console.log('--------------------');
        console.log('\nBoth methods produce the same content, but .stream() provides real-time feedback while .execute() returns a complete object after the task is done.');

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