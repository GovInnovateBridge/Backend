const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead } = require('../controllers/notificationController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getMyNotifications);
router.patch('/:id/read', verifyToken, markAsRead);

module.exports = router;
