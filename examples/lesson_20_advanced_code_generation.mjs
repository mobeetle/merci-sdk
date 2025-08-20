

// lesson_20_advanced_code_generation.mjs
// Merci SDK Tutorial: Lesson 20 - Advanced Code Generation with the Task API

// --- IMPORTS ---
import { MerciClient } from '../lib/merci.2.14.0.mjs';
import { token } from '../secret/token.mjs';

const TASK_ID = 'code-generate:default';

async function main() {
    console.log(`--- Merci SDK Tutorial: Lesson 20 - Advanced Code Generation (Task: ${TASK_ID}) ---`);

    try {
        // --- STEP 1: INITIALIZE THE CLIENT ---
        console.log('[STEP 1] Initializing MerciClient...');
        const client = new MerciClient({ token });

        // --- STEP 2: DEFINE THE CODE CONTEXT (PREFIX & SUFFIX) ---
        console.log('\n[STEP 2] Defining the context for code generation...');
        const prefix = `
class DataProcessor {
    constructor(data) {
        this.data = data;
    }

    // TODO: Implement the 'calculate_average' method
`;
        const suffix = `
}
`;
        // The task is to generate the code that fits between the prefix and suffix.
        const instructions = "Implement the 'calculate_average' method. It should take a 'column_name' string as an argument, access the data via 'this.data', and return the average of the values in that column. The data is an array of objects. Include JSDoc comments.";

        const taskParameters = {
            instructions,
            language: "javascript",
            prefix,
            suffix
        };

        console.log('Instructions:', instructions);

        // --- STEP 3: EXECUTE THE TASK ---
        console.log(`\n[STEP 3] Executing task "${TASK_ID}" with .execute() to get the full result...`);
        const result = await client.tasks.execute(TASK_ID, taskParameters);
        console.log('[INFO] Task execution finished.');

        // --- STEP 4: ASSEMBLE AND DISPLAY THE FINAL CODE ---
        console.log('\n[STEP 4] Assembling the final code...');
        const generatedCode = result.content;
        const finalCode = prefix + generatedCode + suffix;

        console.log('\n\n--- FINAL RESULT ---');
        console.log('The Task API successfully generated the missing method within the class structure:\n');
        console.log('-------------------- CODE START --------------------');
        console.log(finalCode);
        console.log('--------------------- CODE END ---------------------');

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

