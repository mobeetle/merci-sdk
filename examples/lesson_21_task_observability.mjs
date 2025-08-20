

// lesson_21_task_observability.mjs
// Merci SDK Tutorial: Lesson 21 - Task API Observability via Streaming Events

// --- IMPORTS ---
import { MerciClient } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const TASK_ID = 'code-generate:default';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 21 - Task API Observability (Task: ${TASK_ID}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: DEFINE TASK PARAMETERS ---
        console.log('\n[STEP 2] Defining simple parameters for the task...');
        const taskParameters = {
            instructions: "Write a Python function to calculate the factorial of a number using recursion.",
            language: "python",
            prefix: "",
            suffix: ""
        };

        // --- STEP 3: STREAM THE TASK AND HANDLE ALL EVENT TYPES ---
        console.log(`\n[STEP 3] Executing task "${TASK_ID}" with .stream() and listening for all event types...`);
        let finalContent = '';

        const stream = client.tasks.stream(TASK_ID, taskParameters);
        for await (const event of stream) {
            // We use a switch statement to handle each event type differently.
            switch (event.type) {
                case 'Content':
                    // This is the actual output of the task.
                    finalContent += event.content;
                    break;

                case 'ExecutionMetadata':
                    // This provides insight into the internal state or progress of the task.
                    console.log(`\n[OBSERVABILITY] Received ExecutionMetadata:`, event.data);
                    break;

                case 'QuotaMetadata':
                    // This tells you about token usage for the task.
                    console.log(`\n[OBSERVABILITY] Received QuotaMetadata:`, event.data);
                    break;

                case 'FinishMetadata':
                    // This confirms the task has finished and provides the reason.
                    console.log(`\n[OBSERVABILITY] Received FinishMetadata: Task finished with reason '${event.data.reason}'.`);
                    break;

                case 'FunctionCallMetadata':
                    // Some tasks might internally call functions and report them.
                    console.log(`\n[OBSERVABILITY] Received FunctionCallMetadata:`, event.data);
                    break;

                case 'UnknownMetadata':
                    // Future-proofing: handle any new, unknown metadata types gracefully.
                    console.log(`\n[OBSERVABILITY] Received UnknownMetadata:`, event.data);
                    break;

                default:
                    // Log any other event types that might be added in the future.
                    console.log(`\n[INFO] Received unhandled event type: ${event.type}`);
            }
        }
        console.log('\n[INFO] Stream finished.');

        // --- STEP 4: DISPLAY THE FINAL GENERATED CONTENT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log('Final generated content from the task:\n');
        console.log(finalContent);
        console.log('\nBy observing the metadata events, you can build more robust applications that monitor progress and resource usage.');

    } catch (error) {
        console.error('\n\n[FATAL ERROR] An error occurred during the operation.');
        console.error('  Message:', error.message);
        if (error.status) {
            console.error('  API Status:', error.status);
        }
        if (error.details) {
            console.error('  Details:', JSON.stringify(error.details, null, 2));
        }
        console.error('\n  Possible causes: Invalid token, network issues, or an API service problem.');
        process.exit(1);
    }
}

main().catch(console.error);

