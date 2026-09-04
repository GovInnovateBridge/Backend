const express = require('express');
const router = express.Router();
const { register, login, verifyOTP, getMe } = require('../controllers/authController');
const { verifyToken, verifyNodal } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/verify-email', verifyOTP);
router.post('/login', login);

// Returns the logged-in user's data
router.get('/me', verifyToken, getMe);

// Example of how to use specialized RBAC middleware
router.get('/government-only', verifyToken, verifyNodal, (req, res) => {
    res.json({ message: 'Welcome to the government portal' });
});

module.exports = router;