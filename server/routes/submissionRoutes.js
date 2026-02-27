const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const { submitAnswer, finishSubmission } = require('../controllers/submissionController');

router.post('/answer', authMiddleware('student'), submitAnswer);
router.post('/finish', authMiddleware('student'), finishSubmission);

module.exports = router;