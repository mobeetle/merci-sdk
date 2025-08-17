// lesson_17_multimodal_agents.mjs
// Merci SDK Tutorial: Lesson 17 - Multimodal Agents (Vision + Tools)

// --- IMPORTS ---
import { MerciClient, createMediaMessage, createUserMessage } from '../lib/merci.2.11.0.mjs';
import { token } from '../secret/token.mjs';

// This advanced feature requires a powerful multimodal model.
const MODEL = 'openai-gpt-5-mini';

// --- TOOL DEFINITION ---
const inventoryTool = {
    name: 'add_product_to_inventory',
    description: 'Adds a product to the company inventory database.',
    parameters: {
        type: 'object',
        properties: {
            product_name: { type: 'string', description: 'The name of the product, e.g., "Tomato Soup".' },
            brand: { type: 'string', description: 'The brand of the product, e.g., "Campbell\'s".' },
            quantity: { type: 'number', description: 'The number of items to add.' },
        },
        required: ['product_name', 'brand', 'quantity'],
    },
    execute: async ({ product_name, brand, quantity }) => {
        console.log(`\n[TOOL EXECUTING]  DATABASE WRITE: Adding ${quantity} x ${brand} ${product_name}.`);
        return { success: true, productId: `prod_${Date.now()}` };
    },
};

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 17 - Multimodal Agents (Model: ${MODEL}) ---`);
    console.log('NOTE: This lesson requires an `image.png` file in the same directory.');

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('\n[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });
        client.on('tool_start', ({ calls }) => {
            console.log(`\n[EVENT: tool_start] Model is calling '${calls[0].name}' with args: ${calls[0].arguments}`);
        });

        // --- STEP 2: PREPARE PROMPT, IMAGE, AND TOOL ---
        console.log('[STEP 2] Preparing image, prompt, and tool definition...');
        const imagePath = './image.png';
        const userPrompt = "Analyze the attached image and use the provided tool to add the product to our inventory.";
        const tools = [inventoryTool];

        // --- STEP 3: CONFIGURE THE MULTIMODAL AGENT ---
        console.log('[STEP 3] Configuring the agent with the inventory tool...');
        const agent = client.chat(MODEL).withTools(tools);

        // --- STEP 4: PREPARE THE MULTIMODAL MESSAGE PAYLOAD ---
        console.log('[STEP 4] Creating the message payload with both image and text...');
        const messages = [
            await createMediaMessage(imagePath),
            createUserMessage(userPrompt)
        ];

        // --- STEP 5: RUN THE AGENT ---
        console.log('[STEP 5] Running the agent. The model will first see the image, then decide to call the tool...');
        const finalAnswer = await agent.run(messages);

        // --- FINAL RESULT ---
        console.log('\n\n--- FINAL RESULT ---');
        console.log(`🖼️ Media > ${imagePath}`);
        console.log(`👤 User > ${userPrompt}`);
        console.log(`🤖 Assistant > ${finalAnswer}`);
        console.log('--------------------');
        console.log('The model successfully interpreted the image content and used it to populate the tool\'s arguments.');

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`\n[FATAL ERROR] Image file not found at "${error.path}"`);
            console.error('  Please make sure an `image.png` file exists before running the script.');
            process.exit(1);
        }
        console.error('\n\n[FATAL ERROR] An error occurred during the operation.');
        console.error('  Message:', error.message);
        if (error.status) { console.error('  API Status:', error.status); }
        if (error.details) { console.error('  Details:', JSON.stringify(error.details, null, 2)); }
        if (error.stack) { console.error('  Stack:', error.stack); }
        console.error('\n  Possible causes: Invalid token, network issues, or an API service problem.');
        process.exit(1);
    }
}

main().catch(console.error);