
// lesson_22_chaining_task_and_chat.mjs
// Merci SDK Tutorial: Lesson 22 - Chaining Task and Chat APIs for Code Review

// --- IMPORTS ---
import { MerciClient, createUserMessage } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const TASK_ID = 'code-generate:default';
const REVIEW_MODEL = 'openai-gpt-5-mini';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 22 - Chaining Task and Chat APIs ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // === PART 1: GENERATE CODE USING THE TASK API ===
        console.log(`
--- PART 1: Generating Code with Task API (${TASK_ID}) ---`);

        // --- STEP 2: DEFINE TASK PARAMETERS ---
        console.log('[STEP 2] Defining parameters for a slightly flawed function...');
        const taskParameters = {
            instructions: "Write a JavaScript function called 'add' that takes two parameters, 'a' and 'b', and returns their sum. Do not include any type checking.",
            language: "javascript",
            prefix: "",
            suffix: ""
        };

        // --- STEP 3: EXECUTE THE TASK ---
        console.log(`[STEP 3] Executing task "${TASK_ID}"...`);
        const taskResult = await client.tasks.execute(TASK_ID, taskParameters);
        const generatedCode = taskResult.content;
        console.log('[INFO] Code generation finished.');
        console.log(`
--- Generated Code ---
${generatedCode}
----------------------`);

        // === PART 2: REVIEW THE GENERATED CODE USING THE CHAT API ===
        console.log(`
--- PART 2: Reviewing Code with Chat API (${REVIEW_MODEL}) ---`);

        // --- STEP 4: CREATE A PROMPT FOR THE REVIEWER AGENT ---
        console.log('[STEP 4] Creating a code review prompt...');
        const reviewPrompt = `
        You are an expert code reviewer.
        Please review the following JavaScript code. Identify any potential issues, suggest improvements for production readiness (like type checking or error handling), and provide a revised, more robust version of the code.

        CODE TO REVIEW:
        '''javascript
        ${generatedCode}
        '''
        `;

        // --- STEP 5: CONFIGURE AND RUN THE CHAT SESSION ---
        console.log('[STEP 5] Configuring and running the chat session for review...');
        const chatSession = client.chat.session(REVIEW_MODEL);
        const messages = [createUserMessage(reviewPrompt)];

        let finalResponse = '';
        process.stdout.write('🤖 Code Reviewer > ');
        for await (const event of chatSession.stream(messages)) {
            if (event.type === 'text') {
                process.stdout.write(event.content);
                finalResponse += event.content;
            }
        }
        process.stdout.write('');
        console.log(`
[INFO] Code review finished.`);

        // --- FINAL RESULT ---
        console.log(`

--- FINAL RESULT ---`);
        console.log('This lesson demonstrated a powerful workflow:');
        console.log('1. The Task API was used for a specialized generation task.');
        console.log('2. The Chat API was used for a creative, analytical task (code review).');
        console.log(`
This pattern of chaining different APIs together allows for building highly sophisticated applications.`);

    } catch (error) {
        console.error(`

[FATAL ERROR] An error occurred during the operation.`);
        console.error('  Message:', error.message);
        if (error.status) {
            console.error('  API Status:', error.status);
        }
        if (error.details) {
            console.error('  Details:', JSON.stringify(error.details, null, 2));
        }
        console.error(`
  Possible causes: Invalid token, network issues, or an API service problem.`);
        process.exit(1);
    }
}

main().catch(console.error);
