const mongoose = require('mongoose');
const Proposal = require('../models/Proposal');
const Challenge = require('../models/Challenge');
const Escrow = require('../models/Escrow');
const { redactProposal } = require('../services/mlFiltrationService');

// ML TRL Engine service
const upload = require('../middlewares/uploadMiddleware');
const mlTrlService = require('../services/mlTrlService');

// POST /api/proposals/submit
// Startup submits a two-envelope proposal with Zero-Trust TRL Validation
exports.submitProposal = async (req, res) => {
    try {
        const { challengeId, proposal_metadata, pre_requisite_clearance, assigned_evaluator_pool, internal_db_meta, envelope_a_technical, envelope_b_financial, hardware_otp } = req.body;

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

        // --- ZERO-TRUST TRL VERIFICATION VIA ML ENGINE ---
        let verifiedTrlData = { verified_trl: 0, technical_confidence: 0, is_fraud: false };
        
        const isHardwareStartup = envelope_a_technical?.domain === 'HARDWARE';
        const claimedTrl = envelope_a_technical?.claimed_trl || 1;

        if (isHardwareStartup && req.file) {
            // Hardware TRL — Forward file buffer to ML Vision API
            const isVideo = req.file.mimetype.includes('video');
            
            let mlResponse;
            if (isVideo) {
                mlResponse = await mlTrlService.verifyHardwareVideo(
                    req.file.buffer, 
                    req.file.originalname, 
                    hardware_otp
                );
            } else {
                mlResponse = await mlTrlService.verifyHardwareDoc(
                    req.file.buffer, 
                    req.file.originalname
                );
            }
            
            if (!mlResponse.verified) {
                return res.status(400).json({ message: "Hardware Verification Failed: Invalid CAD or Missing OTP in video." });
            }
            verifiedTrlData.technical_confidence = mlResponse.confidence || 1.0;
            verifiedTrlData.verified_trl = claimedTrl;
            
        } else {
            // Software TRL — Full Zero-Trust question + answer + downgrade pipeline
            const pitchData = envelope_a_technical?.startup_pitch || "No pitch provided";
            const backendProofs = {
                github_verified: !!envelope_a_technical?.github_url,
                live_url_verified: !!envelope_a_technical?.live_url
            };

            // Step A: Generate verification questions
            const questionsResult = await mlTrlService.generateQuestions(pitchData, claimedTrl);
            const questions = questionsResult.questions || [];

            // Step B: For auto-submit, use pitch as placeholder answers
            // (In production, questions would be shown to the startup for manual answers)
            const userAnswers = envelope_a_technical?.trl_answers || questions.map(() => pitchData);

            // Step C: Evaluate with the Zero-Trust downgrade engine
            const mlResponse = await mlTrlService.evaluateSoftwareTRL(questions, userAnswers, claimedTrl, backendProofs);
            verifiedTrlData.verified_trl = mlResponse.verified_trl || mlResponse.final_verified_trl || claimedTrl;
            verifiedTrlData.technical_confidence = mlResponse.technical_confidence || 0;
            verifiedTrlData.is_fraud = mlResponse.is_fraud_detected || false;
            
            if (verifiedTrlData.is_fraud) {
                console.warn(`FRAUD DETECTED: Downgrading TRL from ${claimedTrl} to ${verifiedTrlData.verified_trl}`);
            }
        }
        // --- TRL VERIFICATION ENDS ---

        // Generate Submission Ref
        const submissionRefNumber = proposal_metadata?.proposal_id || `PROP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000)}`;

        // ML Call: Redact PII from Envelope A using the Filtration Service
        const rawEnvelopeAText = JSON.stringify(envelope_a_technical);
        const redactionResult = await redactProposal(rawEnvelopeAText);
        const redactedText = redactionResult.redacted_text || redactionResult;

        const maskedEnvelopeA = {
            ...envelope_a_technical,
            rawText: rawEnvelopeAText,
            piiRedactedText: redactedText,
            piiReviewPending: !!redactionResult._fallback
        };

        // 4. Create and Save Proposal Document
        const newProposal = new Proposal({
            challenge: challengeId,
            submittedBy: req.user._id,
            submissionRefNumber,
            proposal_metadata,
            pre_requisite_clearance,
            assigned_evaluator_pool,
            internal_db_meta,
            envelope_a_technical: maskedEnvelopeA,
            envelope_b_financial,
            vaultLocked: true,
            verified_trl_score: verifiedTrlData.verified_trl,
            technical_confidence: verifiedTrlData.technical_confidence,
            is_fraud_flagged: verifiedTrlData.is_fraud
        });

        // 5. Assign to a random Jury member
        const User = require('../models/User');
        const allJuryMembers = await User.find({ role: 'JURY_MEMBER' });
        
        if (allJuryMembers.length > 0) {
            const matchedJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
            newProposal.assignedJury = matchedJury._id;
            newProposal.assignedAt = new Date();
            newProposal.juryReviewStatus = 'PENDING_ACCEPTANCE';
        }

        await newProposal.save();

        res.status(201).json({
            message: 'Proposal submitted and TRL verified successfully!',
            proposal: {
                id: newProposal._id,
                ref: newProposal.submissionRefNumber,
                verified_trl: newProposal.verified_trl_score,
                confidence: newProposal.technical_confidence,
                fraud_flagged: newProposal.is_fraud_flagged,
                status: newProposal.status
            }
        });
    } catch (error) {
        console.error("Error submitting proposal:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// GET /api/proposals/challenge/:challengeId
exports.getProposalsForChallenge = async (req, res) => {
    try {
        const { challengeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(challengeId)) {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }

        const proposals = await Proposal.find({ challenge: challengeId })
            .populate('submittedBy', 'name email')
            .populate('assignedJury', 'name email');

        res.status(200).json(proposals);
    } catch (error) {
        console.error("Error fetching proposals:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/evaluate
// Jury evaluates (scores) a proposal
exports.evaluateProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const { innovation, feasibility, scalability } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid proposal ID' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        if (!proposal.assignedJury || proposal.assignedJury.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'This proposal is not assigned to you.' });
        }

        const totalScore = (innovation || 0) + (feasibility || 0) + (scalability || 0);
        const scoreHash = require('crypto').createHash('sha256').update(JSON.stringify({ innovation, feasibility, scalability, ts: Date.now() })).digest('hex');

        proposal.juryScoreCard = {
            criteria: { innovation, feasibility, scalability },
            totalScore,
            hash: scoreHash,
            evaluatedAt: new Date()
        };
        proposal.status = 'JURY_EVALUATED';
        proposal.juryReviewStatus = 'REVIEW_COMPLETED';

        await proposal.save();

        res.status(200).json({
            message: 'Jury evaluation saved successfully.',
            juryScoreCard: proposal.juryScoreCard
        });
    } catch (error) {
        console.error("Error evaluating proposal:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/officer/evaluate
// Nodal Officer scores (budget + timeline) and computes final weighted score
exports.officerEvaluateProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const { budgetViability, implementationTimeline } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid proposal ID' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        if (proposal.status !== 'JURY_EVALUATED') {
            return res.status(400).json({ message: 'Proposal must be evaluated by Jury first.' });
        }

        const totalOfficerScore = (budgetViability || 0) + (implementationTimeline || 0);
        const scoreHash = require('crypto').createHash('sha256').update(JSON.stringify({ budgetViability, implementationTimeline, ts: Date.now() })).digest('hex');

        proposal.officerScoreCard = {
            criteria: { budgetViability, implementationTimeline },
            totalScore: totalOfficerScore,
            hash: scoreHash,
            evaluatedAt: new Date()
        };

        // Weighted Score: (Jury/70 * 60) + (Officer/30 * 40)
        const juryNormalized = (proposal.juryScoreCard?.totalScore || 0) / 70;
        const officerNormalized = totalOfficerScore / 30;
        proposal.finalWeightedScore = (juryNormalized * 60) + (officerNormalized * 40);
        proposal.status = 'OFFICER_EVALUATED';

        await proposal.save();

        res.status(200).json({
            message: 'Officer evaluation saved. Final weighted score computed.',
            finalWeightedScore: proposal.finalWeightedScore,
            officerScoreCard: proposal.officerScoreCard
        });
    } catch (error) {
        console.error("Error in officer evaluation:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/proposals/:id/award
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

        if (proposal.status !== 'SHORTLISTED') {
            return res.status(400).json({ message: 'Proposal must be SHORTLISTED to award.' });
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
                party_a: { role: "Nodal Agency", entity_name: "Directorate of Urban Traffic Management" },
                party_b: { role: "Innovator", entity_name: proposal.envelope_a_technical?.applicant_display_name || "Startup Name" },
                party_c: { role: "Smart Escrow Platform", entity_name: "GovEscrow Digital Trust Services Pvt. Ltd." }
            },
            parallel_sandboxing_and_financials: {
                actual_discovered_cost: proposal.envelope_b_financial?.pilot_execution_bid?.amount_inr || 1250000
            },
            dispute_resolution: { deemed_approval_mechanism: { timer_days: 7 } }
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

        proposal.agreementStatus = 'SIGNED';
        proposal.escrowStatus = 'FROZEN';
        await proposal.save();

        // Initialize 15-35-50 Escrow
        const totalBudget = proposal.envelope_b_financial?.pilot_execution_bid?.amount_inr || 1000000;
        
        await Escrow.create({
            proposal: proposal._id,
            challenge: proposal.challenge,
            milestones: [
                { code: "M1", amount: totalBudget * 0.15 },
                { code: "M2", amount: totalBudget * 0.35 },
                { code: "M3", amount: totalBudget * 0.50 }
            ]
        });

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
exports.declineJuryAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const proposal = await Proposal.findById(id);
        const User = require('../models/User');

        if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
        
        if (!proposal.assignedJury || proposal.assignedJury.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'This proposal is not assigned to you.' });
        }

        console.log(`Jury ${req.user.email} declined proposal ${proposal.submissionRefNumber}. Reassigning...`);
        
        const allJuryMembers = await User.find({ role: 'JURY_MEMBER' });
        let newJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
        
        let attempts = 0;
        while (newJury._id.toString() === req.user._id.toString() && attempts < 5) {
            newJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
            attempts++;
        }

        proposal.assignedJury = newJury._id;
        proposal.assignedAt = new Date();
        proposal.juryReviewStatus = 'PENDING_ACCEPTANCE';
        await proposal.save();

        res.status(200).json({ message: 'Assignment declined and reassigned to another Jury.', newAssignedJury: newJury._id });
    } catch (error) {
        console.error("Error declining assignment:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
