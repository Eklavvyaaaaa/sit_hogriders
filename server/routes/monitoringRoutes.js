const express = require('express');
const router = express.Router();
const { logEvent, getLogs } = require('../controllers/monitoringController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/log', authMiddleware('student'), logEvent);
router.get('/:examId', authMiddleware('teacher'), getLogs);

module.exports = router;
