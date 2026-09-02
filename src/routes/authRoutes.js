const express = require('express');
const router = express.Router();
const { register, login, verifyOTP, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/verify-email', verifyOTP);
router.post('/login', login);

// Returns the logged-in user's data
router.get('/me', protect, getMe);

// Example of how Mahak will use your RBAC middleware later
router.get('/government-only', protect, authorize('NODAL_OFFICER'), (req, res) => {
    res.json({ message: 'Welcome to the government portal' });
});

module.exports = router;