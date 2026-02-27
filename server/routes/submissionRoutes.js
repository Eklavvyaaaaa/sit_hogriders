const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const { submitAnswer, finishSubmission, submitExam, getSubmissionStatus } = require('../controllers/submissionController');

router.post('/answer', authMiddleware('student'), submitAnswer);
router.post('/finish', authMiddleware('student'), finishSubmission);
router.post('/submit', authMiddleware('student'), submitExam);
router.get('/status/:examId', authMiddleware('student'), getSubmissionStatus);

module.exports = router;