// lesson_14_observability_and_error_handling.mjs
// Merci SDK Tutorial: Lesson 14 - Production-Ready Observability & Error Handling

// --- IMPORTS ---
import { MerciClient, createUserMessage } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

// To reliably trigger a 400-level error, we use a model name that does not exist.
const MODEL = 'invalid-model-name-for-testing';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 14 - Observability & Error Handling (Model: ${MODEL}) ---`);

    // --- STEP 1: INITIALIZE THE CLIENT WITH EVENT LISTENERS ---
    console.log('[STEP 1] Initializing MerciClient with observability listeners...');
    const client = new MerciClient({ token });

    // These listeners provide a detailed log of the SDK's internal operations.
    // This is invaluable for debugging and monitoring in a production environment.
    client.on('api_request', ({ url, method }) => {
        console.log(`\n[EVENT: api_request] ➡️  Sending ${method} request to ${url}`);
    });
    client.on('api_response', ({ url, status, ok }) => {
        const icon = ok ? '✅' : '❌';
        console.log(`[EVENT: api_response] ⬅️  Received response from ${url} | Status: ${status} ${icon}`);
    });
    client.on('error', (error) => {
        // This listener catches errors that happen deep inside the SDK, like a failed token refresh.
        console.error(`[EVENT: error] 🚨 An internal SDK error was caught: ${error.message}`);
    });


    // --- STEP 2: ATTEMPT A FAULTY REQUEST TO DEMONSTRATE ERROR HANDLING ---
    console.log('\n[STEP 2] Attempting a request that is expected to fail...');
    try {
        const userPrompt = "This request will fail because the model profile is invalid.";
        const messages = [createUserMessage(userPrompt)];

        // We don't need any special parameters. Simply creating a chat session
        // with an invalid model name is enough to guarantee an API error.
        const chatSession = client.chat.session(MODEL);

        console.log('[INFO] Sending request with an invalid model name to cause a 400 Bad Request error...');
        // We don't need to process the stream, just trigger the call.
        for await (const event of chatSession.stream(messages)) { /* consume stream */ }

    } catch (error) {
        // --- STEP 3: CATCH AND INSPECT THE APIError OBJECT ---
        console.log('\n[STEP 3] Successfully caught the expected error. Now inspecting it...');
        console.error('\n\n--- DETAILED ERROR ANALYSIS ---');
        console.error('  Message:', error.message);

        // The APIError object contains structured data that is crucial for robust error handling.
        if (error.status) {
            console.error('  API Status:', error.status);
            if (error.status === 400) {
                console.error('  [ANALYSIS] This is a 400 Bad Request. As expected, the API rejected our request because the model profile was invalid. Check the API documentation for available models.');
            } else if (error.status === 401) {
                console.error('  [ANALYSIS] This is a 401 Unauthorized error. Your token is invalid or has expired.');
            } else if (error.status === 429) {
                console.error('  [ANALYSIS] This is a 429 Too Many Requests error. You have hit a rate limit. Implement exponential backoff and retry.');
            }
        }
        if (error.details) {
            console.error('  Details:', JSON.stringify(error.details, null, 2));
        }
        console.error('---------------------------------');
    }

    console.log('\n\n[INFO] Lesson complete. This demonstrates how to use SDK events and typed errors to build a resilient application.');
}

main().catch(err => {
    // A final catch block for any unexpected errors during the main execution.
    // We only log if it's not our expected APIError, which we've already handled.
    if (!err.status) {
        console.error("\n\n[FATAL ERROR] An unexpected error occurred:", err);
        process.exit(1);
    }
});