const express = require('express');
const router = express.Router();
const { generateClassroom, joinClassroom } = require('../controllers/classroomController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/generate', authMiddleware('teacher'), generateClassroom);
router.post('/join', authMiddleware('student'), joinClassroom);

module.exports = router;
