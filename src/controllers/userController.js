const User = require('../models/User');

exports.getStartupProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -otp -otpExpires -kpiVector');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ message: "Server error fetching profile" });
    }
};

exports.updateStartupProfile = async (req, res) => {
    try {
        const { dpiitNumber, logoUrl, profileDescription } = req.body;

        // Only allow updating editable fields
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { 
                dpiitNumber, 
                logoUrl, 
                profileDescription 
            },
            { new: true, runValidators: true }
        ).select('-password -otp -otpExpires -kpiVector');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ message: "Server error updating profile" });
    }
};
