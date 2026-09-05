const Notification = require('../models/Notification');

// GET /api/notifications
exports.getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
            
        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.status(200).json({ message: 'Marked as read', notification });
    } catch (error) {
        console.error("Error marking notification read:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
