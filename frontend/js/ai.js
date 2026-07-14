// ==========================================================================
// EduGame-AI - Dịch Vụ Kết Nối AI Bản Cập Nhật Tự Động Sửa Lỗi (ai.js)
// ==========================================================================

function normalizeQuestionShape(question, index = 0) {
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
        answer: answerIndex,
        id: question?.id ?? index + 1,
        topic: question?.topic || 'Tài liệu học tập',
        difficulty: question?.difficulty || 'medium'
    };
}

function normalizeGeneratedQuestions(questions) {
    return (Array.isArray(questions) ? questions : [])
        .map((question, index) => normalizeQuestionShape(question, index))
        .filter((question) => question.question);
}

const AI_SERVICE = {
    // Đã sửa: Gọi về server trung gian của bạn ở cổng 5000
    aiApiUrl: 'http://localhost:5000/api/ai/generate',

    async generateGameQuestions(fileId, gameType = 'quiz') {
        try {
            console.log(`[AI Service]: Đang kết nối gửi dữ liệu lên Server...`);

            const response = await fetch(this.aiApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, gameType })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Server báo lỗi.');
            }

            const data = await response.json();
            if (!data.success) {
                return null;
            }

            const questions = normalizeGeneratedQuestions(data.questions);
            return questions;

        } catch (error) {
            console.error('⚠️ [AI Service Error]:', error);
            alert(`Lỗi phân tích AI: ${error.message}`);
            return null;
        }
    }
};