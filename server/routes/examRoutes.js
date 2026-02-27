const express = require('express');
const router = express.Router();
const { createExam, getTeacherExams, submitExam, getExamStats, getExamFlagged, exportExamLogs } = require('../controllers/examController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware('teacher'), createExam);
router.get('/', authMiddleware('teacher'), getTeacherExams);
router.post('/submit', authMiddleware('student'), submitExam);
router.get('/:id/stats', authMiddleware('teacher'), getExamStats);
router.get('/:id/flagged', authMiddleware('teacher'), getExamFlagged);
router.get('/:id/export', authMiddleware('teacher'), exportExamLogs);

module.exports = router;
