const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { getExamReview } = require('../controllers/reviewController');

// Only teachers should access this ideally
router.get('/:exam_id', auth('teacher'), getExamReview);

module.exports = router;