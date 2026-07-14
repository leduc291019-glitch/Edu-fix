const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
    try {
        const pager = await ai.models.list();

        for await (const model of pager) {
            console.log(model.name);
        }
    } catch (e) {
        console.error(e);
    }
}

main();