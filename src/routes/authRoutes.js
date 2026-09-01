const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);

// Example of a protected, role-based route
router.get('/government-only', protect, authorize('government', 'admin'), (req, res) => {
    res.json({ message: 'Welcome to the government portal' });
});

module.exports = router;