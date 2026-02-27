const express = require('express');
const router = express.Router();
const { getStats, getOverview } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/stats', authMiddleware('teacher'), getStats);
router.get('/overview', authMiddleware('teacher'), getOverview);

module.exports = router;
