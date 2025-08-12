// lesson_4_media_messages.mjs
// Merci SDK Tutorial: Lesson 4 - Using Media Messages (Multimodality)

// --- IMPORTS ---
// We import helpers for each distinct message type we will send.
import { MerciClient, createMediaMessage, createUserMessage } from './merci.2.11.0.mjs';
import { token } from "./token.mjs";

// --- CONSTANTS ---
// To process images, you MUST select a model with vision capabilities.
const MODEL = 'openai-gpt-5-mini';

// ==============================================================================
// == PRE-REQUISITE: CREATE AN IMAGE FILE                                      ==
// == Before running, create `image.png` or change `imagePath` below.        ==
// ==============================================================================

/**
 * This lesson demonstrates the correct way to send images to a multimodal LLM.
 */
async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 4 - Media Messages (Model: ${MODEL}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: DEFINE PROMPT AND INPUT DATA ---
        // We define the path to our local image and the text prompt that refers to it.
        console.log('[STEP 2] Preparing prompt and input data...');
        const imagePath = './image.png';
        const userPrompt = "What is in this image? Describe it in a single, detailed sentence.";

        // --- STEP 3: CONFIGURE THE CHAT SESSION ---
        // No special configuration is needed on the session itself, just the right model.
        console.log('[STEP 3] Configuring the chat session...');
        const chatSession = client.chat(MODEL);

        // --- STEP 4: PREPARE THE MESSAGE PAYLOAD ---
        // THIS IS THE MOST IMPORTANT PART OF THE LESSON.
        // To link an image with a question, you send the media message first,
        // followed immediately by the user message in the same request.
        console.log('[STEP 4] Building the message array with separate media and user messages...');
        const messages = [
            await createMediaMessage(imagePath),
            createUserMessage(userPrompt)
        ];

        // --- STEP 5: EXECUTE THE REQUEST & PROCESS THE RESPONSE ---
        console.log('[STEP 5] Sending multimodal request and processing stream...');
        let finalResponse = '';
        process.stdout.write('🤖 Vision Assistant > ');

        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                process.stdout.write(event.content);
                finalResponse += event.content;
            }
        }
        process.stdout.write('\n');
        console.log('\n[INFO] Stream finished. Response fully received.');

        // --- STEP 6: DISPLAY THE FINAL OUTPUT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`🖼️ Media > ${imagePath}`);
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Vision Assistant > ${finalResponse}`);
        console.log('--------------------');

    } catch (error) {
        // --- ROBUST ERROR HANDLING ---
        if (error.code === 'ENOENT') {
            console.error(`\n[FATAL ERROR] Image file not found at "${error.path}"`);
            console.error('  Please make sure the image file exists before running the script.');
            process.exit(1);
        }
        console.error('\n\n[FATAL ERROR] An error occurred during the operation.');
        console.error('  Message:', error.message);
        if (error.status) { console.error('  API Status:', error.status); }
        if (error.details) { console.error('  Details:', JSON.stringify(error.details, null, 2)); }
        if (error.stack) { console.error('  Stack:', error.stack); }
        process.exit(1);
    }
}

// --- EXECUTION ---
main().catch(console.error);