const jwt = require('jsonwebtoken');
const User = require('../models/User');

// verifyToken: Verifies token and attaches user to request
exports.verifyToken = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

exports.verifyStartup = (req, res, next) => {
    if (req.user && (req.user.role === 'startup' || req.user.role === 'STARTUP_FOUNDER')) {
        next();
    } else {
        res.status(403).json({ error: "Forbidden: insufficient role, startup required" });
    }
};

exports.verifyNodal = (req, res, next) => {
    if (req.user && (req.user.role === 'nodal_officer' || req.user.role === 'NODAL_OFFICER')) {
        next();
    } else {
        res.status(403).json({ error: "Forbidden: insufficient role, nodal officer required" });
    }
};

exports.verifyJury = async (req, res, next) => {
    if (req.user && (req.user.role === 'jury_member' || req.user.role === 'JURY_MEMBER')) {
        // Validation of challenge.status === 'JURY_EVALUATION' will be handled in the controller 
        // or a separate middleware specific to the route since it requires fetching the challenge.
        next();
    } else {
        res.status(403).json({ error: "Forbidden: insufficient role, jury member required" });
    }
};