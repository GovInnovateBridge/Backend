const mongoose = require('mongoose');

const milestoneReportSchema = new mongoose.Schema({
    escrow: { type: mongoose.Schema.Types.ObjectId, ref: "Escrow", required: true },
    milestoneCode: { type: String, enum: ["M1", "M2", "M3"], required: true },
    startup: { type: mongoose.Schema.Types.ObjectId, ref: "StartupProfile" },
    workDetails: { type: String, required: true },
    officerAnalysis: { type: String },
    status: { type: String, enum: ["SUBMITTED", "ANALYZED"], default: "SUBMITTED" }
}, { timestamps: true });

module.exports = mongoose.model('MilestoneReport', milestoneReportSchema);
