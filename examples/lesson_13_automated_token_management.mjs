// lesson_13_automated_token_management.mjs
// Merci SDK Tutorial: Lesson 13 - AAutomated Token Management

// --- IMPORTS ---
import { MerciClient, createUserMessage } from '../lib/merci.2.11.0.mjs';
import { token as initialToken } from '../secret/token.mjs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MODEL = 'google-chat-gemini-flash-2.5';

/**
 * A helper function to save the new token back to its source file.
 * This is the key to making the refreshed token persistent.
 * @param {string} newToken The new JWT to save.
 */
async function saveToken(newToken) {
    console.log('\n[INFO] New token received. Saving to file...');
    try {
        const tokenFilePath = path.resolve(process.cwd(), '../secret/token.mjs');
        const fileContent = `// This file is auto-generated. Do not edit manually.\n// Last updated: ${new Date().toISOString()}\nexport const token = "${newToken}";\n`;
        await fs.writeFile(tokenFilePath, fileContent, 'utf-8');
        console.log(`[SUCCESS] Token successfully saved to ${tokenFilePath}`);
    } catch (error) {
        console.error('[ERROR] Failed to save the new token.', error);
    }
}


async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 13 - Automated Token Management ---`);
    console.log('This lesson shows how to automatically save a refreshed token for future use.');

    try {
        // This variable will hold the new token if the SDK refreshes it.
        let capturedNewToken = null;

        // --- STEP 1: INITIALIZE THE CLIENT ---
        // We will intentionally use the (potentially expired) token from our file.
        console.log('\n[STEP 1] Initializing MerciClient with the token from secret/token.mjs...');
        const client = new MerciClient({ token: initialToken });

        // --- STEP 2: SET UP EVENT LISTENERS ---
        // The SDK is designed to refresh the token automatically when it receives a
        // 401 Unauthorized error. We can listen for events to monitor this process.
        console.log('[STEP 2] Setting up event listeners for token refresh...');

        client.on('token_refresh_start', () => {
            // This event fires when the API returns a 401, confirming the token is invalid.
            console.log('\n[EVENT: token_refresh_start] API request failed (401). Current token is invalid. Attempting to refresh...');
        });

        // With our SDK fix, this event now receives the new token.
        client.on('token_refresh_success', (newToken) => {
            console.log(`[EVENT: token_refresh_success] Successfully obtained a new token.`);
            capturedNewToken = newToken;
        });

        // --- STEP 3: MAKE AN API CALL ---
        // We make a standard API call. If `initialToken` is expired, the SDK's
        // internal `_fetchWithRetry` logic will automatically trigger the refresh
        // flow before completing the request.
        console.log('\n[STEP 3] Making an API call to trigger the process...');
        const userPrompt = "Confirm you are operational.";
        const messages = [createUserMessage(userPrompt)];
        const chatSession = client.chat(MODEL);

        let finalResponse = '';
        process.stdout.write('🤖 Assistant > ');
        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                process.stdout.write(event.content);
                finalResponse += event.content;
            }
        }
        process.stdout.write('\n');
        console.log('\n[INFO] Stream finished. Response fully received.');

        // --- STEP 4: PERSIST THE NEW TOKEN IF CAPTURED ---
        // After the API call is complete, we check if our event listener captured a new token.
        console.log('\n[STEP 4] Checking if a new token was captured...');
        if (capturedNewToken) {
            await saveToken(capturedNewToken);
            console.log('\nThe next time you run any lesson, it will use the new, valid token directly.');
        } else {
            console.log('No token refresh was needed. The initial token is still valid.');
        }

        // --- STEP 5: DISPLAY THE FINAL OUTPUT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Assistant > ${finalResponse}`);
        console.log('--------------------');

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
        console.error('\n  Possible causes: Your token is too old to be refreshed, network issues, or an API service problem.');
        process.exit(1); // Exit with a non-zero code to indicate failure.
    }
}

main().catch(console.error);