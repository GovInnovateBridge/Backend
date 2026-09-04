const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const Challenge = require('../models/Challenge');
const { maskPII, runSandboxSimulation } = require('../utils/mlAdapter');

// POST /api/proposals/submit
// Startup submits a two-envelope proposal
exports.submitProposal = async (req, res) => {
    try {
        const { challengeId, dpiitNumber, startupName, executiveSummary, techStack, technicalArchitecture, implementationPlan, rawText, trialBudgetInr, commercialUnitBudgetInr, totalGrantRequestedInr, milestones } = req.body;

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

        // 2. ML PII Masking (Envelope A)
        const piiRedactedText = await maskPII(rawText);
        
        // Mocking matchmaking vector for now
        const kpiMatchVector = {
            overallMatchScore: Math.floor(Math.random() * 20) + 80, // Random score between 80-100
            note: "Mocked matchmaking score"
        };

        // 3. Financial Payload Encryption (Envelope B)
        // In a real scenario, this would be a proper AES encryption using a secure key
        const encryptedPayload = Buffer.from(JSON.stringify({
            trialBudgetInr, commercialUnitBudgetInr, totalGrantRequestedInr, milestones
        })).toString('base64'); // Simple base64 encoding as a placeholder for actual encryption

        // Generate Submission Ref
        const submissionRefNumber = `PROP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;

        // 4. Create and Save Proposal Document
        const newProposal = new Proposal({
            challenge: challengeId,
            submittedBy: req.user._id,
            submissionRefNumber,
            envelope_a_technical: {
                dpiitNumber,
                startupName,
                executiveSummary,
                techStack,
                technicalArchitecture,
                implementationPlan,
                rawText,
                piiRedactedText,
                kpiMatchVector
            },
            envelope_b_financial: {
                trialBudgetInr,
                commercialUnitBudgetInr,
                totalGrantRequestedInr,
                milestones,
                encryptedPayload,
                vaultLocked: true // Default locked state
            },
            status: 'SUBMITTED'
        });

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
