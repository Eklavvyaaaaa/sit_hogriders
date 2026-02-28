const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadQuestions, getQuestions, generateExamFromBank } = require('../controllers/questionBankController');
const authMiddleware = require('../middleware/authMiddleware');

// Store files initially in an uploads directory locally
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed!'), false);
        }
    }
});

// Protect routes to ensure only teachers can access
router.post('/upload', authMiddleware(['teacher']), upload.single('file'), uploadQuestions);
router.get('/', authMiddleware(['teacher']), getQuestions);
router.post('/generate-exam', authMiddleware(['teacher']), generateExamFromBank);

module.exports = router;
