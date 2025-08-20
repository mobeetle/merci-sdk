// lesson_7_json_output.mjs
// Merci SDK Tutorial: Lesson 7 - Guaranteed JSON Output

// --- IMPORTS ---
import { MerciClient, createUserMessage } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const MODEL = 'google-chat-gemini-flash-2.5';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 7 - Guaranteed JSON (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: DEFINE PROMPT AND INPUT DATA ---
        console.log('[STEP 2] Preparing prompt and input data...');
        const unstructuredText = `User ID 54321, named Alice, is a 29-year-old Data Scientist from Berlin. Her email is alice.s@web.de and she is an active user. Her known skills are R, Pandas, and Scikit-learn.`;
        const userPrompt = `
Based on the following data, create a JSON object.
The JSON object must have these keys: "name", "email", "age", "city", "skills", "id", "isActive".
The age and id must be numbers. The isActive must be a boolean.

DATA:
\`\`\`
${unstructuredText}
\`\`\`
`;

        // --- STEP 3: CONFIGURE THE CHAT SESSION ---
        // The `.asJson()` method instructs the model to enter a constrained
        // generation mode, guaranteeing its output is a parsable JSON string.
        console.log('[STEP 3] Configuring chat session with .asJson()...');
        const chatSession = client.chat.session(MODEL)
            .withParameters(builder => builder.asJson());

        // --- STEP 4: PREPARE THE MESSAGE PAYLOAD ---
        console.log('[STEP 4] Creating the message payload...');
        const messages = [createUserMessage(userPrompt)];

        // --- STEP 5: EXECUTE THE REQUEST & PROCESS THE RESPONSE ---
        console.log('[STEP 5] Sending request and collecting raw JSON response...');
        let rawResponse = '';
        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                rawResponse += event.content;
            }
        }
        console.log('[INFO] Stream finished. Response fully received.');
        console.log('-------------------------------------------\nRaw response from model:\n' + rawResponse + '\n-------------------------------------------');

        // --- STEP 6: DISPLAY THE FINAL OUTPUT (PARSED) ---
        console.log('\n[STEP 6] Parsing the guaranteed JSON response...');
        try {
            const parsedObject = JSON.parse(rawResponse);
            console.log('\n\n--- FINAL RESULT ---');
            console.log('✅✅✅ VICTORY! The response was successfully and directly parsed.');
            console.log('\nHere is the final JavaScript object:');
            console.log(parsedObject);
            console.log(`\nWe can now reliably access data, e.g., user's city: ${parsedObject.city}`);
            console.log('--------------------');
        } catch (e) {
            console.error('❌ FAILURE: The model failed to produce valid JSON even in JSON mode.', e);
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
    }
}

main().catch(console.error);