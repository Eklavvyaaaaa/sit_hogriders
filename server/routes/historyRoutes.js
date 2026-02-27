const express = require('express');
const router = express.Router();
const { getStudentHistory, getSubmissionDetail, getExamResults } = require('../controllers/historyController');
const authMiddleware = require('../middleware/authMiddleware');

// Student: their exam history
router.get('/student', authMiddleware('student'), getStudentHistory);

// Both: detailed submission view
router.get('/submission/:submissionId', authMiddleware(), getSubmissionDetail);

// Teacher: all results for an exam
router.get('/exam/:examId', authMiddleware('teacher'), getExamResults);

module.exports = router;
