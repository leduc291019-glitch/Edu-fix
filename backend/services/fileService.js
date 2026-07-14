const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

function ensureUploadDir(uploadDir) {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

function createUploadStorage(uploadDir) {
    // ĐÃ THÊM: Tự động gọi hàm tạo thư mục nếu chưa tồn tại
    ensureUploadDir(uploadDir);

    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname);
            const originalNameCleaned = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
            cb(null, `${originalNameCleaned}-${uniqueSuffix}${ext}`);
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedExtensions = ['.pdf', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Hệ thống chỉ hỗ trợ định dạng .pdf, .docx và .txt'), false);
        }
    };

    return multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
}

function buildUploadMetadata(file) {
    const today = new Date();
    const dateString = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    return {
        success: true,
        message: 'Tải file lên máy chủ thành công!',
        fileId: `server_doc_${file.filename.split('-')[1]}`,
        fileName: file.originalname,
        uploadDate: dateString
    };
}

function findUploadedFile(uploadDir, fileId) {
    const files = fs.readdirSync(uploadDir);
    const searchToken = fileId.replace('server_doc_', '');
    return files.find((file) => file.includes(searchToken) && !file.startsWith('analysis_')) || null;
}

async function extractDocumentText(filePath, matchedFile) {
    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === '.txt') {
            return fs.readFileSync(filePath, 'utf8');
        }

        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            return pdfData.text?.trim() || `Tài liệu PDF: ${matchedFile}. Hãy tạo 20 câu hỏi trắc nghiệm dựa trên nội dung chính của tài liệu này.`;
        }

        if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value?.trim() || `Tài liệu Word: ${matchedFile}. Hãy tạo 20 câu hỏi trắc nghiệm dựa trên nội dung chính của tài liệu này.`;
        }
    } catch (error) {
        console.warn(`[File Service] Không thể trích xuất nội dung từ ${matchedFile}: ${error.message}`);
    }

    return `Tài liệu môn học: ${matchedFile}. Hãy biên soạn câu hỏi trắc nghiệm kiến thức dựa trên tên tài liệu này.`;
}

function readTextContent(filePath, matchedFile) {
    return extractDocumentText(filePath, matchedFile);
}

function saveAnalysis(uploadDir, sourceFile, questions) {
    const jsonFileName = `analysis_${Date.now()}-${sourceFile}.json`;
    const jsonFilePath = path.join(uploadDir, jsonFileName);

    fs.writeFileSync(
        jsonFilePath,
        JSON.stringify({
            sourceFile,
            analyzedAt: new Date().toISOString(),
            questions
        }, null, 4),
        'utf8'
    );

    return jsonFileName;
}

module.exports = {
    ensureUploadDir,
    createUploadStorage,
    buildUploadMetadata,
    findUploadedFile,
    extractDocumentText,
    readTextContent,
    saveAnalysis
};