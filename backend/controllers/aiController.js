const path = require('path');
const { findUploadedFile, readTextContent, saveAnalysis } = require('../services/fileService');
const { generateQuestionsFromContent } = require('../services/aiService');

exports.handleGenerateQuestions = async (req, res) => {
    try {
        const { fileId, gameType = 'quiz' } = req.body;

        if (!fileId) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin ID tài liệu.' });
        }

        const uploadDir = path.join(__dirname, '..', 'uploads');
        const matchedFile = findUploadedFile(uploadDir, fileId);

        if (!matchedFile) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy file trên server.' });
        }

        const filePath = path.join(uploadDir, matchedFile);
        const fileContent = await readTextContent(filePath, matchedFile);
        const questions = await generateQuestionsFromContent(fileContent, gameType);

        saveAnalysis(uploadDir, matchedFile, questions);

        res.status(200).json({ success: true, questions });
    } catch (error) {
        console.error('❌ [AI Controller Error]:', error);
        res.status(500).json({ success: false, message: `Lỗi xử lý API: ${error.message}` });
    }
};
