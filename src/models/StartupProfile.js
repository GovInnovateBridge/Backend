const mongoose = require('mongoose');

const startupProfileSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    companyName: { type: String, required: true },
    dpiitNumber: { type: String, required: true, unique: true },
    dpiitDetails: { type: Object }, // Fetched from Startup India during registration
    // You can easily add more startup-specific fields here later (e.g., website, sector)
}, { timestamps: true });

module.exports = mongoose.model('StartupProfile', startupProfileSchema);