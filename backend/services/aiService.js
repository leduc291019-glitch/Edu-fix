const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

function normalizeQuestionAnswer(question) {
    const options = Array.isArray(question?.options)
        ? question.options.filter(Boolean).map((opt) => String(opt).trim()).slice(0, 4)
        : [];

    let answerIndex = null;

    if (typeof question?.answer === 'number' && Number.isInteger(question.answer) && question.answer >= 0 && question.answer < options.length) {
        answerIndex = question.answer;
    } else if (typeof question?.answer === 'string') {
        const normalizedAnswer = question.answer.trim().toUpperCase();

        if (/^[A-D]$/.test(normalizedAnswer)) {
            answerIndex = normalizedAnswer.charCodeAt(0) - 65;
        } else {
            const matchedIndex = options.findIndex((opt) => opt.toLowerCase() === normalizedAnswer.toLowerCase());
            if (matchedIndex >= 0) {
                answerIndex = matchedIndex;
            }
        }
    }

    if (answerIndex === null && options.length > 0) {
        answerIndex = 0;
    }

    return {
        ...question,
        question: String(question?.question || '').trim(),
        options,
        answer: answerIndex
    };
}

function normalizeGeneratedQuestions(questions) {
    return (Array.isArray(questions) ? questions : [])
        .map((question) => normalizeQuestionAnswer(question))
        .filter((question) => question.question);
}

function parseGeminiJson(rawText) {
    if (!rawText) {
        throw new Error("Gemini trả về nội dung rỗng.");
    }

    let text = String(rawText).trim();

    if (text.startsWith("```") && text.endsWith("```")) {
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        const firstBracket = text.indexOf("[");
        const lastBracket = text.lastIndexOf("]");

        const start = Math.min(firstBrace >= 0 ? firstBrace : Number.MAX_SAFE_INTEGER, firstBracket >= 0 ? firstBracket : Number.MAX_SAFE_INTEGER);
        const end = Math.max(lastBrace >= 0 ? lastBrace : -1, lastBracket >= 0 ? lastBracket : -1);

        if (start === Number.MAX_SAFE_INTEGER || end === -1) {
            throw error;
        }

        const candidate = text.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(candidate);
    }
}

exports.generateQuestionsFromContent = async (
    fileContent,
    gameType = "quiz"
) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Thiếu GEMINI_API_KEY trong biến môi trường.");
        }

        const prompt = `
Bạn là chuyên gia giáo dục.

Dựa vào nội dung sau hãy tạo CHÍNH XÁC 20 câu hỏi trắc nghiệm.

Yêu cầu:

- Đúng 20 câu.
- Mỗi câu có 4 lựa chọn.
- answer phải trùng hoàn toàn với một option.
- Không giải thích.
- Chỉ trả về JSON.
- Không dùng markdown code block, không giải thích thêm, không viết bất kỳ văn bản nào ngoài JSON.

Định dạng:

{
  "questions":[
    {
      "question":"...",
      "options":["A","B","C","D"],
      "answer":"A"
    }
  ]
}

Nội dung tài liệu:

${fileContent}
`;

        const modelCandidates = [
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash",
            "gemini-2.0-flash-001"
        ];
        let lastError = null;

        for (const modelName of modelCandidates) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        temperature: 0.7,
                        responseMimeType: "application/json",
                    },
                });

                const raw = response?.text || "";
                const parsed = parseGeminiJson(raw);

                let questions = normalizeGeneratedQuestions(parsed.questions || []);

                if (questions.length > 20) {
                    questions = questions.slice(0, 20);
                }

                return questions;
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ [AI Service] Model ${modelName} failed: ${err.message}`);
            }
        }

        throw new Error(`Không thể tạo câu hỏi bằng Gemini: ${lastError?.message || "Unknown error"}`);
    } catch (err) {
        console.error('❌ [AI Service Error]:', err);
        throw new Error(`Không thể tạo câu hỏi bằng Gemini: ${err.message}`);
    }
};