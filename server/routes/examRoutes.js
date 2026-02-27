const express = require('express');
const router = express.Router();
const { createExam, getTeacherExams, submitExam } = require('../controllers/examController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware('teacher'), createExam);
router.get('/', authMiddleware('teacher'), getTeacherExams);
router.post('/submit', authMiddleware('student'), submitExam);

module.exports = router;
