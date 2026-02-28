const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// All notification routes require authentication
router.use(authMiddleware());

// Get all notifications for the logged in user
router.get('/', notificationController.getNotifications);

// Mark a specific notification (or 'all') as read
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
