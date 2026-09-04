const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const Challenge = require('../models/Challenge');
const { maskPII, runSandboxSimulation } = require('../utils/mlAdapter');

// POST /api/proposals/submit
// Startup submits a two-envelope proposal
exports.submitProposal = async (req, res) => {
    try {
        const { challengeId, proposal_metadata, pre_requisite_clearance, assigned_evaluator_pool, internal_db_meta, envelope_a_technical, envelope_b_financial } = req.body;

        // 1. Validation Checks
        if (!mongoose.Types.ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }

        const challenge = await Challenge.findById(challengeId);

        if (!challenge || challenge.status !== 'PUBLISHED') {
            return res.status(400).json({ message: 'Challenge is not available or not published.' });
        }

        if (new Date() > new Date(challenge.evaluationDeadline)) {
            return res.status(400).json({ message: 'Evaluation deadline has passed.' });
        }

        // Optional: Check if startup already submitted for this challenge
        const existingProposal = await Proposal.findOne({ challenge: challengeId, submittedBy: req.user._id });
        if (existingProposal) {
            return res.status(400).json({ message: 'You have already submitted a proposal for this challenge.' });
        }

        // Generate Submission Ref
        const submissionRefNumber = proposal_metadata?.proposal_id || `PROP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;

        // 4. Create and Save Proposal Document
        const newProposal = new Proposal({
            challenge: challengeId,
            submittedBy: req.user._id,
            submissionRefNumber,
            proposal_metadata,
            pre_requisite_clearance,
            assigned_evaluator_pool,
            internal_db_meta,
            envelope_a_technical,
            envelope_b_financial,
            vaultLocked: true // Always locked initially
        });

        // 5. Mock ML Semantic Matchmaking: Assign to a random Jury member
        const User = require('../models/User');
        const allJuryMembers = await User.find({ role: 'JURY_MEMBER' });
        
        if (allJuryMembers.length > 0) {
            console.log("🧠 [ML Matchmaking] Running Semantic Matchmaking to find best Jury (mock)...");
            const matchedJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
            newProposal.assignedJury = matchedJury._id;
            newProposal.assignedAt = new Date();
            newProposal.juryReviewStatus = 'PENDING_ACCEPTANCE';
            console.log(`🧠 [ML Matchmaking] Proposal ${submissionRefNumber} assigned to Jury ${matchedJury.email}`);
        } else {
            console.warn("⚠️ No Jury members found for automatic assignment.");
        }

        await newProposal.save();

        res.status(201).json({
            message: 'Two-envelope proposal submitted successfully!',
            proposalRef: submissionRefNumber,
            proposalId: newProposal._id
        });

    } catch (error) {
        console.error("Error submitting proposal:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/proposals/challenge/:challengeId
// Jury or Nodal Officer fetches proposals for evaluation
exports.getProposalsForChallenge = async (req, res) => {
    try {
        const { challengeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }

        const challenge = await Challenge.findById(challengeId);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Fetch proposals for this challenge
        let proposals = await Proposal.find({ challenge: challengeId })
            // Sort by ML Matchmaking score (highest first) for the dashboard
            .sort({ 'envelope_a_technical.kpiMatchVector.overallMatchScore': -1 });

        // Enforce Envelope B Lock based on middleware
        // lockEnvelopeBMiddleware sets req.envelopeBUnlocked
        if (!req.envelopeBUnlocked) {
            proposals = proposals.map(proposal => {
                const p = proposal.toObject();
                // Scrub the financial data completely to ensure blind evaluation
                delete p.envelope_b_financial;
                return p;
            });
        }

        res.status(200).json({
            message: 'Proposals fetched successfully',
            envelopeBUnlocked: req.envelopeBUnlocked || false,
            count: proposals.length,
            proposals
        });

    } catch (error) {
        console.error("Error fetching proposals:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/evaluate
// Jury evaluates a proposal (SHORTLISTED or REJECTED)
exports.evaluateProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comments } = req.body; // e.g. status: "SHORTLISTED", comments: "Good approach"

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid proposal ID' });
        }

        if (!["SHORTLISTED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be SHORTLISTED or REJECTED.' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        const challenge = await Challenge.findById(proposal.challenge);
        if (challenge.status !== 'EVALUATING') {
            return res.status(400).json({ message: 'Challenge is not in the EVALUATING phase.' });
        }

        proposal.status = status;
        
        // MVP: We could store comments in a new array or field, but for now we just change status.
        // If we want to save comments, we should add it to the Proposal schema, or log it.
        // We will just update status for this phase.

        await proposal.save();

        res.status(200).json({
            message: `Proposal successfully ${status.toLowerCase()}`,
            proposal
        });

    } catch (error) {
        console.error("Error evaluating proposal:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/proposals/:id/sandbox-run
// Startup triggers a simulated Sandbox test
exports.runSandboxTest = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid proposal ID' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        if (proposal.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only test your own proposal.' });
        }

        if (proposal.status !== 'SHORTLISTED') {
            return res.status(400).json({ message: 'Proposal must be SHORTLISTED to enter Sandbox.' });
        }

        const challenge = await Challenge.findById(proposal.challenge);
        if (challenge.status !== 'SANDBOX_ACTIVE') {
            return res.status(400).json({ message: 'The parent challenge is not in the SANDBOX_ACTIVE phase.' });
        }

        if (proposal.escrowStatus !== 'FROZEN') {
            return res.status(400).json({ message: 'Trial budget must be frozen in escrow before running the Sandbox.' });
        }

        // Run Mock Sandbox metrics generator
        const metrics = await runSandboxSimulation(id);
        
        proposal.sandboxMetrics = metrics;
        proposal.status = 'SANDBOX_TESTED';
        await proposal.save();

        res.status(200).json({
            message: 'Sandbox test completed successfully!',
            metrics: proposal.sandboxMetrics,
            status: proposal.status
        });
    } catch (error) {
        console.error("Error running sandbox:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/award
// Nodal Officer awards the grant
exports.awardGrant = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid proposal ID' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        const challenge = await Challenge.findById(proposal.challenge);
        
        if (challenge.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only award grants for your own challenges.' });
        }

        if (proposal.status !== 'SANDBOX_TESTED') {
            return res.status(400).json({ message: 'Proposal must pass the Sandbox phase (SANDBOX_TESTED) to be awarded.' });
        }

        proposal.status = 'AWARDED';
        await proposal.save();

        res.status(200).json({
            message: 'Congratulations! The grant has been successfully AWARDED to the startup.',
            proposal
        });
    } catch (error) {
        console.error("Error awarding grant:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// POST /api/proposals/:id/agreement/generate
// Nodal Officer generates a dummy agreement for a shortlisted proposal
exports.generateAgreement = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid proposal ID' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        const challenge = await Challenge.findById(proposal.challenge);
        if (challenge.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only generate agreements for your own challenges.' });
        }

        if (proposal.status !== 'SHORTLISTED') {
            return res.status(400).json({ message: 'Proposal must be SHORTLISTED to generate an agreement.' });
        }

        proposal.agreementStatus = 'PENDING_SIGNATURE';
        proposal.agreementHash = 'HASH_' + require('crypto').randomBytes(16).toString('hex').toUpperCase();
        
        // Mocking the detailed JSON Agreement payload based on the PDF format
        proposal.agreementData = {
            agreement_metadata: {
                agreement_id: `SAHYOG/BGSE/${new Date().getFullYear()}/DEL/00147`,
                platform: "Project Sahyog - B2G Smart Escrow & Procurement Innovation Sandbox",
                document_type: "B2G Smart Escrow Pilot Agreement",
                status: "ACTIVE",
                version: "1.1",
                document_hash_reference: "sha256:pending_on_smart_contract_deployment"
            },
            parties_involved: {
                party_a: {
                    role: "Nodal Agency",
                    entity_name: "Directorate of Urban Traffic Management"
                },
                party_b: {
                    role: "Innovator",
                    entity_name: proposal.envelope_a_technical?.applicant_display_name || "Startup Name"
                },
                party_c: {
                    role: "Smart Escrow Platform",
                    entity_name: "GovEscrow Digital Trust Services Pvt. Ltd."
                }
            },
            parallel_sandboxing_and_financials: {
                actual_discovered_cost: proposal.envelope_b_financial?.pilot_execution_bid?.amount_inr || 1250000
            },
            dispute_resolution: {
                deemed_approval_mechanism: {
                    timer_days: 7
                }
            }
        };

        await proposal.save();

        res.status(200).json({
            message: 'Agreement generated successfully. Waiting for startup signature.',
            agreementHash: proposal.agreementHash,
            agreementStatus: proposal.agreementStatus,
            agreementData: proposal.agreementData
        });
    } catch (error) {
        console.error("Error generating agreement:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/agreement/sign
// Startup signs the agreement, triggering automatic escrow freeze
exports.signAgreement = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid proposal ID' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        if (proposal.submittedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only sign your own agreement.' });
        }

        if (proposal.agreementStatus !== 'PENDING_SIGNATURE') {
            return res.status(400).json({ message: 'No pending agreement found to sign.' });
        }

        // Sign agreement
        proposal.agreementStatus = 'SIGNED';
        
        // Auto-freeze escrow upon signing
        proposal.escrowStatus = 'FROZEN';
        
        await proposal.save();

        res.status(200).json({
            message: 'Agreement signed successfully! Trial budget is now FROZEN in smart escrow.',
            agreementStatus: proposal.agreementStatus,
            escrowStatus: proposal.escrowStatus
        });
    } catch (error) {
        console.error("Error signing agreement:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/jury/accept
// Jury accepts the proposal assignment
exports.acceptJuryAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const proposal = await Proposal.findById(id);

        if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
        
        if (!proposal.assignedJury || proposal.assignedJury.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'This proposal is not assigned to you.' });
        }

        if (proposal.juryReviewStatus !== 'PENDING_ACCEPTANCE') {
            return res.status(400).json({ message: 'Assignment is no longer pending.' });
        }

        proposal.juryReviewStatus = 'ACCEPTED';
        await proposal.save();

        res.status(200).json({ message: 'Assignment accepted successfully.', proposal });
    } catch (error) {
        console.error("Error accepting assignment:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/jury/decline
// Jury declines the proposal, triggering immediate reassignment
exports.declineJuryAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const proposal = await Proposal.findById(id);
        const User = require('../models/User');

        if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
        
        if (!proposal.assignedJury || proposal.assignedJury.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'This proposal is not assigned to you.' });
        }

        console.log(`🔄 Jury ${req.user.email} declined proposal ${proposal.submissionRefNumber}. Reassigning immediately...`);
        
        const allJuryMembers = await User.find({ role: 'JURY_MEMBER' });
        let newJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
        
        let attempts = 0;
        while (newJury._id.toString() === req.user._id.toString() && attempts < 5) {
            newJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
            attempts++;
        }

        proposal.assignedJury = newJury._id;
        proposal.assignedAt = new Date();
        proposal.juryReviewStatus = 'PENDING_ACCEPTANCE'; // Send back to pending for the new jury
        await proposal.save();

        res.status(200).json({ message: 'Assignment declined and reassigned to another Jury.', newAssignedJury: newJury._id });
    } catch (error) {
        console.error("Error declining assignment:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
