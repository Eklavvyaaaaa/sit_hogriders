const express = require('express');
const router = express.Router();
const { logEvent, getLogs, terminateSession, requestLastChance } = require('../controllers/monitoringController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/log', authMiddleware('student'), logEvent);
router.post('/terminate', authMiddleware('student'), terminateSession);
router.post('/last-chance', authMiddleware('student'), requestLastChance);
router.get('/logs/:examId', authMiddleware('teacher'), getLogs);

module.exports = router;
