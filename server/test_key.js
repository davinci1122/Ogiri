const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // There isn't a direct listModels method on the client instance in some versions?
        // Actually the error message said "Call ListModels". 
        // Usually this is done via a model manager or similar in other SDKs.
        // In @google/generative-ai, there isn't a simple public listModels helper attached to the main class in all docs.
        // But let's try to just generate content with 'gemini-pro' and 'gemini-1.5-flash' specifically to see specific errors.

        console.log("Testing Key:", process.env.GEMINI_API_KEY);

        const modelsToTest = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

        for (const modelName of modelsToTest) {
            console.log(`\nTesting model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                console.log(`SUCCESS: ${modelName} is working.`);
                console.log("Response:", result.response.text());
                return; // Exit if one works
            } catch (error) {
                console.error(`FAILED: ${modelName}`);
                console.error("Error Message:", error.message);
            }
        }
    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

listModels();
