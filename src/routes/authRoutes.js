const express = require('express');
const router = express.Router();
const { register, login, verifyOTP, getMe, getUserProfile } = require('../controllers/authController');
const { verifyToken, verifyNodal } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/verify-email', verifyOTP);
router.post('/login', login);

// Returns the logged-in user's data
router.get('/me', verifyToken, getMe);

// Returns any user's profile (for Nodal Officer/Jury to view post-evaluation)
router.get('/profile/:id', verifyToken, getUserProfile);

// Example of how to use specialized RBAC middleware
router.get('/government-only', verifyToken, verifyNodal, (req, res) => {
    res.json({ message: 'Welcome to the Government Portal' });
});

module.exports = router;