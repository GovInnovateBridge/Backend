const Escrow = require('../models/Escrow');
const Proposal = require('../models/Proposal');
const mockGateway = require('./mockGatewayController');

exports.claimMilestone = async (req, res) => {
    try {
        const { escrowId, milestoneCode } = req.body;
        
        const escrow = await Escrow.findById(escrowId);
        if (!escrow) return res.status(404).json({ message: "Escrow not found" });

        // Match against your schema's 'code' field
        const milestone = escrow.milestones.find(m => m.code === milestoneCode);
        if (!milestone) return res.status(404).json({ message: "Milestone not found" });

        // Update state to CLAIMED and set your specific timeline fields
        milestone.status = "CLAIMED";
        milestone.claimedAt = new Date();
        
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 3); // 3-day Auto-Approval limit
        milestone.deemedApprovalDeadline = deadline;

        await escrow.save();

        return res.status(200).json({
            milestoneCode: milestone.code,
            status: milestone.status,
            deemedApprovalDeadline: milestone.deemedApprovalDeadline
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.approveMilestone = async (req, res) => {
    try {
        const { escrowId, milestoneCode } = req.body;
        
        const escrow = await Escrow.findById(escrowId);
        if (!escrow) return res.status(404).json({ message: "Escrow not found" });

        const milestone = escrow.milestones.find(m => m.code === milestoneCode);
        if (!milestone) return res.status(404).json({ message: "Milestone not found" });

        // Mock req/res to directly call the PFMS mock function from Phase 2.2
        // It now intelligently pulls the exact amount from your schema
        const mockReq = { 
            body: { 
                escrowId, 
                milestoneCode, 
                amount: milestone.amount, 
                beneficiaryAccount: "MOCK-ACC-123" 
            } 
        };
        
        let pfmsData = {};
        const mockRes = {
            status: () => mockRes,
            json: (data) => { pfmsData = data; return data; }
        };

        // Intra-owner call to simulate disbursement
        mockGateway.disbursePFMS(mockReq, mockRes);

        // Set status to RELEASED and write the transaction reference and timestamps
        milestone.status = "RELEASED";
        milestone.approvedAt = new Date();
        milestone.releasedAt = new Date();
        milestone.pfmsTransactionRef = pfmsData.transactionRef;

        await escrow.save();

        return res.status(200).json({
            milestoneCode: milestone.code,
            status: milestone.status,
            pfmsTransactionRef: milestone.pfmsTransactionRef
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PATCH /api/escrow/reject
// Nodal Officer rejects/partially pays a milestone and Evicts the Startup
exports.rejectMilestone = async (req, res) => {
    try {
        const { escrowId, milestoneCode, partialAmount } = req.body;
        
        const escrow = await Escrow.findById(escrowId);
        if (!escrow) return res.status(404).json({ message: "Escrow not found" });

        const milestone = escrow.milestones.find(m => m.code === milestoneCode);
        if (!milestone) return res.status(404).json({ message: "Milestone not found" });

        // Ensure partial amount is <= 50% of the milestone
        const maxAllowed = milestone.amount * 0.5;
        const finalPayout = Math.min(Number(partialAmount) || 0, maxAllowed);

        milestone.status = "DISPUTED";
        milestone.approvedAt = new Date(); // Marked as resolved but disputed

        // Mock PFMS for the partial amount if any
        if (finalPayout > 0) {
            const mockReq = { body: { escrowId, milestoneCode, amount: finalPayout, beneficiaryAccount: "MOCK-ACC-123" } };
            let pfmsData = {};
            const mockRes = { status: () => mockRes, json: (data) => { pfmsData = data; return data; } };
            mockGateway.disbursePFMS(mockReq, mockRes);
            milestone.pfmsTransactionRef = pfmsData.transactionRef;
            milestone.status = "RELEASED"; // It was released partially
        }

        milestone.releasedAt = new Date();
        await escrow.save();

        // Mark Proposal as Evicted
        const proposal = await Proposal.findById(escrow.proposal);
        if (proposal) {
            proposal.status = "EVICTED_FROM_SANDBOX";
            await proposal.save();
        }

        return res.status(200).json({
            message: `Startup evicted. Paid ${finalPayout} (Max 50%).`,
            status: milestone.status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/escrow
exports.getEscrows = async (req, res) => {
    try {
        // In a full production app, you would filter this by req.user._id
        // For now, this returns the escrows so the frontend can read the _id
        const escrows = await Escrow.find(); 
        
        return res.status(200).json(escrows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};