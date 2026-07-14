const express = require('express');
const { handleUpload } = require('../controllers/uploadController');
const { handleGenerateQuestions } = require('../controllers/aiController');

module.exports = function createUploadRoutes(upload) {
    const router = express.Router();

    // Accept any single file field to be more tolerant of client-side field name variations
    router.post('/api/upload', upload.any(), handleUpload);
    router.post('/api/ai/generate', handleGenerateQuestions);

    return router;
};
