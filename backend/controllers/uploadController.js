const path = require('path');
const { buildUploadMetadata, readTextContent, saveAnalysis } = require('../services/fileService');
const { generateQuestionsFromContent } = require('../services/aiService');

exports.handleUpload = async (req, res) => {
    try {
        // (upload debug logs removed)
        const uploadedFile = req.file || (Array.isArray(req.files) && req.files[0]) || null;

        if (!uploadedFile) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn một file hợp lệ.' });
        }

        const metadata = buildUploadMetadata(uploadedFile);

        // Read the uploaded file's text content
        const uploadDir = path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadDir, uploadedFile.filename);
        const fileContent = await readTextContent(filePath, uploadedFile.filename);

        // Generate questions using configured AI (Gemini / fallback)
        let questions = [];
        try {
            questions = await generateQuestionsFromContent(fileContent, 'quiz');
        } catch (aiErr) {
            console.warn('[Upload Controller] AI generation failed:', aiErr?.message || aiErr);
            questions = [];
        }

        // Save analysis JSON for later retrieval
        const analysisFile = saveAnalysis(uploadDir, uploadedFile.filename, questions || []);

        return res.status(200).json({
            ...metadata,
            analysisFile,
            questions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
