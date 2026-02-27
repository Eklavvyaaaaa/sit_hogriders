const express = require('express');
const router = express.Router();
const { getMessages, sendMessage } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:examId', authMiddleware(), getMessages);
router.post('/', authMiddleware(), sendMessage);

module.exports = router;
