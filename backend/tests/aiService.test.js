const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generateQuestionsFromContent } = require('../services/aiService');
const { extractDocumentText } = require('../services/fileService');

test('falls back to local quiz generation when the AI API fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
        throw new Error('network unavailable');
    };

    try {
        const questions = await generateQuestionsFromContent('Đại số là môn học về số và biến số.', 'quiz');

        assert.ok(Array.isArray(questions), 'should return an array of questions');
        assert.equal(questions.length, 20, 'should generate exactly 20 questions');
        assert.equal(questions[0].options.length, 4, 'should return 4 options per question');
        assert.ok(Number.isInteger(questions[0].answer), 'answer should be an integer index');
    } finally {
        global.fetch = originalFetch;
    }
});

test('expands a short AI response to 20 questions', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: true,
        json: async () => ({
            choices: [{
                message: {
                    content: JSON.stringify({
                        questions: [{
                            id: 1,
                            question: 'Đại số là gì?',
                            options: ['Một nhánh toán học', 'Một loại hoa', 'Một trò chơi', 'Một thành phố'],
                            answer: 0
                        }]
                    })
                }
            }]
        })
    });

    try {
        const questions = await generateQuestionsFromContent('Đại số là môn học về số và biến số.', 'quiz');
        assert.equal(questions.length, 20, 'should expand to exactly 20 questions');
        assert.equal(questions[0].question.includes('Đại số') || questions[0].question.includes('đại số'), true);
    } finally {
        global.fetch = originalFetch;
    }
});

test('extracts text from an uploaded document before generating questions', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edugame-'));
    const filePath = path.join(tempDir, 'sample.txt');
    fs.writeFileSync(filePath, 'Đại số là môn học về số và biến số. Hàm số có thể được biểu diễn bằng đồ thị.', 'utf8');

    try {
        const extractedText = await extractDocumentText(filePath, 'sample.txt');
        assert.match(extractedText, /Đại số/);
        assert.match(extractedText, /Hàm số/);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('builds direct topic-based questions with distinct options', async () => {
    const questions = await generateQuestionsFromContent('TypeScript là ngôn ngữ lập trình mạnh. Generics giúp viết mã tổng quát và tái sử dụng.', 'quiz');

    assert.ok(Array.isArray(questions), 'should return an array of questions');
    assert.equal(questions.length, 20, 'should generate 20 questions');

    const sample = questions[0];
    assert.match(sample.question.toLowerCase(), /(khái niệm|ví dụ|ứng dụng|đúng|câu nào|điều nào)/);
    assert.equal(sample.options.length, 4, 'should return 4 options');
    assert.equal(new Set(sample.options.map((option) => option.toLowerCase())).size, 4, 'options should be distinct');
    assert.ok(sample.topic, 'should include a topic label');
});

test('hides the correct answer by rotating the option order', async () => {
    const originalFetch = global.fetch;
    const originalRandom = Math.random;

    global.fetch = async () => ({
        ok: true,
        json: async () => ({
            choices: [{
                message: {
                    content: JSON.stringify({
                        questions: [{
                            id: 1,
                            question: 'Đại số là gì?',
                            options: ['Một nhánh toán học', 'Một loại hoa', 'Một trò chơi', 'Một thành phố'],
                            answer: 0
                        }]
                    })
                }
            }]
        })
    });
    Math.random = () => 0.8;

    try {
        const questions = await generateQuestionsFromContent('Đại số là môn học về số và biến số.', 'quiz');
        assert.ok(Array.isArray(questions));
        assert.notEqual(questions[0].answer, 0, 'the correct answer should not stay in the first option position');
    } finally {
        global.fetch = originalFetch;
        Math.random = originalRandom;
    }
});

test('uses the configured Gemini model from environment', async () => {
    const originalFetch = global.fetch;
    const originalApiKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;

    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';

    let requestedUrl = '';
    global.fetch = async (url) => {
        requestedUrl = url;
        return {
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: '{"questions":[{"id":1,"question":"Đại số là gì?","options":["Một nhánh toán học","Một loại hoa","Một trò chơi","Một thành phố"],"answer":0,"topic":"Khái niệm","difficulty":"easy"}]}' }] } }]
            })
        };
    };

    try {
        const questions = await generateQuestionsFromContent('Đại số là môn học về số và biến số.', 'quiz');
        assert.ok(Array.isArray(questions), 'should return an array of questions');
        assert.match(requestedUrl, /gemini-2\.5-flash/);
    } finally {
        global.fetch = originalFetch;
        if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalApiKey;
        if (originalModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = originalModel;
    }
});
