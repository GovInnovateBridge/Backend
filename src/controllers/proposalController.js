const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const Challenge = require('../models/Challenge');
const { maskPII } = require('../utils/mlAdapter');

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
