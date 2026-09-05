const mongoose = require('mongoose');

const governmentProfileSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    departmentName: { type: String, required: true },
    designation: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('GovernmentProfile', governmentProfileSchema);