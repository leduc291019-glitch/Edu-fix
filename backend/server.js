const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import Services
const { ensureUploadDir, createUploadStorage } = require('./services/fileService');

// Import Controllers (Đảm bảo đường dẫn tới thư mục controllers là chính xác)
const { handleUpload } = require('./controllers/uploadController');
const { handleGenerateQuestions } = require('./controllers/aiController');

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.join(__dirname, 'uploads');

// Đảm bảo thư mục upload tồn tại
ensureUploadDir(uploadDir);

// Cấu hình Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Khởi tạo Multer
const upload = createUploadStorage(uploadDir);

// =========================================================================
// KHAI BÁO ROUTER CHÍNH THỨC (Khớp 100% với Frontend upload.js và ai.js)
// =========================================================================

// 1. API Upload File (Sử dụng 'file' để khớp với frontend)
app.post('/api/upload', upload.single('file'), handleUpload);

// 2. API AI Generate
app.post('/api/ai/generate', handleGenerateQuestions);

// =========================================================================

// Cấp quyền truy cập trực tiếp vào file đã upload (nếu cần tải xuống)
app.use('/uploads', express.static(uploadDir));

// Route kiểm tra sức khỏe của Server
app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Backend is running' });
});

// Xử lý Route không tồn tại (404)
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Xử lý lỗi toàn cục (Bắt lỗi từ Multer hoặc hệ thống)
app.use((err, req, res, next) => {
    if (err) {
        console.error('❌ [Global Error Handler]:', err);
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 EduGame-AI server is running at http://localhost:${PORT}`);
    });
}

module.exports = app;