const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { claimMilestone, approveMilestone, getEscrows } = require('../controllers/escrowController');

// Real JWT Auth Middleware
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Attach the user object to the request
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) return res.status(401).json({ message: 'User not found' });
            
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Role Restriction Middleware
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "You do not have permission to perform this action" });
        }
        next();
    };
};

// GET route for the frontend to fetch the escrow list and IDs
router.get('/', protect, getEscrows);

router.post('/claim-milestone', protect, restrictTo('STARTUP_FOUNDER'), claimMilestone);
router.post('/approve', protect, restrictTo('NODAL_OFFICER'), approveMilestone);

module.exports = router;