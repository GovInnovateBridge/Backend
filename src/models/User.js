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
    otpExpires: { type: Date },

    // Startup Profile Fields (used for Matchmaking & Profile)
    profileDescription: { type: String, default: '' },
    dpiitNumber: { type: String, default: null },
    logoUrl: { type: String, default: null },
    govTrustScore: { type: Number, default: 0 },
    escrowsCompleted: { type: Number, default: 0 },
    totalFundsDisbursed: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    kpiVector: { type: [Number], default: [] },
    hasCompletedTrl: { type: Boolean, default: false },
    verifiedTrlScore: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
