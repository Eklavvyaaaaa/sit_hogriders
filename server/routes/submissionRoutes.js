const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { submitAnswer, finishSubmission } = require('../controllers/submissionController');

router.post('/answer', auth, submitAnswer);
router.post('/finish', auth, finishSubmission);

module.exports = router;