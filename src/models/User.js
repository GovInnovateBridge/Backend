const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    role: { 
        type: String, 
        enum: ['NODAL_OFFICER', 'STARTUP_FOUNDER', 'VIEWER', 'JURY_MEMBER'], 
        required: true 
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);