const MilestoneReport = require('../models/MilestoneReport');
const Escrow = require('../models/Escrow');

// POST /api/escrow/:escrowId/milestone/:milestoneCode/report
exports.submitReport = async (req, res) => {
    try {
        const { escrowId, milestoneCode } = req.params;
        const { workDetails } = req.body;

        const escrow = await Escrow.findById(escrowId);
        if (!escrow) return res.status(404).json({ message: "Escrow not found" });

        // Upsert report
        let report = await MilestoneReport.findOne({ escrow: escrowId, milestoneCode });
        if (report) {
            report.workDetails = workDetails;
            report.status = "SUBMITTED";
            await report.save();
        } else {
            report = await MilestoneReport.create({
                escrow: escrowId,
                milestoneCode,
                workDetails,
                status: "SUBMITTED"
            });
        }

        return res.status(200).json({ message: "Report submitted successfully", report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/escrow/:escrowId/milestone/:milestoneCode/report
exports.getReport = async (req, res) => {
    try {
        const { escrowId, milestoneCode } = req.params;
        const report = await MilestoneReport.findOne({ escrow: escrowId, milestoneCode });
        
        if (!report) return res.status(404).json({ message: "No report found for this milestone" });

        return res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/escrow/:escrowId/milestone/:milestoneCode/analyze
exports.submitAnalysis = async (req, res) => {
    try {
        const { escrowId, milestoneCode } = req.params;
        const { officerAnalysis } = req.body;

        const report = await MilestoneReport.findOne({ escrow: escrowId, milestoneCode });
        if (!report) return res.status(404).json({ message: "No report found to analyze" });

        report.officerAnalysis = officerAnalysis;
        report.status = "ANALYZED";
        await report.save();

        return res.status(200).json({ message: "Analysis saved successfully", report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
