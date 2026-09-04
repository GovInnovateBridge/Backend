const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    psNumber: { type: String }, // e.g. "PS-2026-MH-001"
    departmentName: { type: String }, // e.g. "Dept of Urban Development"
    category: { type: String }, // e.g. "AI_ML", "CYBER_SECURITY", "SMART_CITY", "HEALTHCARE"
    
    title: { type: String, required: true },
    problemStatementRaw: { type: String, required: true },
    scopeOfWork: { type: String },
    expectedDeliverables: [{ type: String }],
    
    // Extracted by ML KPI Extractor
    extractedKPIs: { type: Object },
    
    // Budgets set by Government
    pilotBudgetInr: { type: Number }, // Budget specifically allocated for Pilot / PoC
    
    status: {
        type: String,
        enum: ["DRAFT", "PUBLISHED", "EVALUATING", "SANDBOX_ACTIVE", "AWARDED", "CLOSED"],
        default: "DRAFT"
    },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date },
    evaluationDeadline: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);