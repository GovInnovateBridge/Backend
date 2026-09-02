const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, 
        enum: ['startup', 'government', 'viewer'], default: 'viewer' },
    isVerified: { type: Boolean, default: false },
        otp: { type: String },
        otpExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);