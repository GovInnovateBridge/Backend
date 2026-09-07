const User = require('../models/User');

const trlGuard = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (req.user.role === 'STARTUP_FOUNDER') {
            const user = await User.findById(req.user._id);
            if (!user || !user.hasCompletedTrl) {
                return res.status(403).json({ message: 'Access denied. You must complete the TRL Assessment first.' });
            }
        }

        next();
    } catch (error) {
        console.error('Error in trlGuard middleware:', error);
        res.status(500).json({ message: 'Server error in TRL Guard' });
    }
};

module.exports = trlGuard;
