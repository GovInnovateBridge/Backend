const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // PDF calls this passwordHash, we use password
    role: { 
        type: String, 
        enum: ['NODAL_OFFICER', 'STARTUP_FOUNDER', 'VIEWER'], 
        required: true 
    },
    organization: { type: String }, // For Gov: Department Name. For Startup: Company Name.
    dpiitNumber: { type: String }, // Only for STARTUP_FOUNDER
    isActive: { type: Boolean, default: true },
    
    // OTP Verification Fields (From our previous implementation)
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);