const express = require('express');
const router = express.Router();
const { register, login, verifyOTP } = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/verify-email', verifyOTP);
router.post('/login', login);

router.get('/government-only', protect, authorize('government', 'admin'), (req, res) => {
    res.json({ message: 'Welcome to the government portal' });
});

module.exports = router;