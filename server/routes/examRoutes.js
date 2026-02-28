const express = require('express');
const router = express.Router();
const { createExam, getTeacherExams, getMyExams, submitExam, getExamStats, getExamFlagged, exportExamLogs, updateExamTime, terminateExam, rescheduleExam, deleteExam, stopExam, extendExam, grantReattempt } = require('../controllers/examController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware('teacher'), createExam);
router.get('/my-exams', authMiddleware('teacher'), getMyExams);
router.get('/', authMiddleware('teacher'), getTeacherExams);
router.post('/submit', authMiddleware('student'), submitExam);
router.get('/:id/stats', authMiddleware('teacher'), getExamStats);
router.get('/:id/flagged', authMiddleware('teacher'), getExamFlagged);
router.get('/:id/export', authMiddleware('teacher'), exportExamLogs);
router.patch('/:id/time', authMiddleware('teacher'), updateExamTime);
router.patch('/:id/terminate', authMiddleware('teacher'), terminateExam);
router.patch('/:id/reschedule', authMiddleware('teacher'), rescheduleExam);
router.patch('/:id/stop', authMiddleware('teacher'), stopExam);
router.patch('/:id/extend', authMiddleware('teacher'), extendExam);
router.patch('/:examId/grant/:studentId', authMiddleware('teacher'), grantReattempt);
router.delete('/:id', authMiddleware('teacher'), deleteExam);

module.exports = router;
