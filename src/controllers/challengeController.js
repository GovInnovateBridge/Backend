const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { semanticTriage, formulateChallenge } = require('../services/mlFiltrationService');
const { sendEmail } = require('../services/emailService');

// POST /api/challenges/create
// Nodal Officer creates a new challenge (status defaults to DRAFT)
exports.createChallenge = async (req, res) => {
    try {
        const { title, problemStatementRaw, scopeOfWork, expectedDeliverables, pilotBudgetInr, evaluationDeadline, category, departmentName } = req.body;

        // Generate a random PS Number if not provided (mock generation)
        const psNumber = req.body.psNumber || `PS-${new Date().getFullYear()}-MH-${Math.floor(Math.random() * 1000)}`;

        // ML Call: Auto-extract KPIs and Anti-Bias check
        const mlResult = await formulateChallenge(problemStatementRaw);
        
        if (mlResult.success === false && mlResult.bias_detected) {
            return res.status(406).json({ message: mlResult.bias_reason });
        }

        const structuredData = mlResult.data || {};
        const generatedTitle = structuredData.title || title || 'AI Generated Challenge';
        const generatedScope = structuredData.problem_statement || scopeOfWork;
        const generatedKPIs = structuredData.kpis ? structuredData.kpis.map(kpi => ({ metric: kpi, target: 'Required' })) : [];

        const extractedKPIs = { 
            detected_keywords: [], 
            complexity_level: structuredData.budget_range || 'Medium',
            metrics: generatedKPIs
        };

        const newChallenge = new Challenge({
            psNumber,
            departmentName,
            category,
            title: generatedTitle,
            problemStatementRaw,
            scopeOfWork: generatedScope,
            expectedDeliverables,
            pilotBudgetInr,
            evaluationDeadline,
            extractedKPIs,
            createdBy: req.user._id,
            status: 'DRAFT'
        });

        await newChallenge.save();

        res.status(201).json({
            message: 'Challenge created successfully as DRAFT.',
            challenge: newChallenge
        });
    } catch (error) {
        console.error("Error creating challenge:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/challenges/:id/publish
// Nodal Officer publishes a drafted challenge
exports.publishChallenge = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }

        const challenge = await Challenge.findById(id);

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Verify the user is the creator (or at least a Nodal Officer, handled by middleware)
        if (challenge.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only publish challenges you created.' });
        }

        if (challenge.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Challenge is already published or in another state.' });
        }

        challenge.status = 'PUBLISHED';
        challenge.publishedAt = new Date();
        
        // 1. Set 7-day application deadline
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        challenge.applicationDeadline = deadline;

        await challenge.save();

        // 2. SMART MATCHMAKING (Push Notifications)
        // Find all active Startup Founders
        const startups = await User.find({ role: 'STARTUP_FOUNDER', isActive: true });
        
        if (startups.length > 0 && (challenge.scopeOfWork || challenge.problemStatementRaw)) {
            const startupProposals = startups.map(s => ({
                id: s._id.toString(), 
                text: s.profileDescription || "Technology startup looking to build innovative solutions."
            }));

            // ML Call: Semantic Triage against Startup Profiles
            const mlResponse = await semanticTriage(challenge.scopeOfWork || challenge.problemStatementRaw, startupProposals);
            
            if (mlResponse && mlResponse.matches) {
                // Filter matches >= 80% (0.8)
                const highMatches = mlResponse.matches.filter(r => r.score >= 0.8);
                
                for (const match of highMatches) {
                    const startupUser = startups.find(s => s._id.toString() === match.id);
                    if (startupUser) {
                        // Create Notification
                        await Notification.create({
                            recipient: startupUser._id,
                            title: '🎯 New Matching Challenge Released!',
                            message: `A new Problem Statement (${challenge.psNumber}) matching your profile has been released. You have 7 days to submit your proposal. Deadline: ${deadline.toDateString()}`,
                            challengeId: challenge._id
                        });

                        // Send Email Notification
                        const kpiList = challenge.extractedKPIs?.metrics?.map(k => `- ${k.metric}: ${k.target}`).join('\n') || 'None specified.';
                        
                        const emailBody = `
Hello ${startupUser.name},

A new Official Problem Statement (${challenge.psNumber}) matching your startup's profile (${(match.score*100).toFixed(0)}% match) has just been published by the Department of Innovation.

=======================================================
GOVERNMENT OF MAHARASHTRA
OFFICIAL PROBLEM STATEMENT DRAFT
=======================================================

1. SUBJECT TITLE:
${challenge.title}

2. SCOPE OF WORK & PROBLEM DESCRIPTION:
${challenge.scopeOfWork}

3. KEY PERFORMANCE INDICATORS (KPIs):
${kpiList}

4. ALLOCATED PILOT BUDGET:
₹ ${challenge.pilotBudgetInr ? challenge.pilotBudgetInr.toLocaleString('en-IN') : 'TBD'}

=======================================================

You have until ${deadline.toDateString()} to submit your proposal via the GovInnovateBridge portal.

Regards,
GovInnovateBridge Matchmaking Engine
                        `.trim();

                        await sendEmail(
                            startupUser.email,
                            `🎯 OFFICIAL MATCH: New Problem Statement Released - ${challenge.psNumber}`,
                            emailBody
                        );
                    }
                }
            }
        }

        res.status(200).json({
            message: 'Challenge published successfully! Notifications sent to matching startups.',
            challenge
        });
    } catch (error) {
        console.error("Error publishing challenge:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/challenges/:id/evaluate
// Nodal Officer changes status to EVALUATING to begin Jury phase
exports.startEvaluation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }

        const challenge = await Challenge.findById(id);

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        if (challenge.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only start evaluation for challenges you created.' });
        }

        if (challenge.status !== 'PUBLISHED') {
            return res.status(400).json({ message: 'Challenge must be PUBLISHED before evaluation can start.' });
        }

        challenge.status = 'EVALUATING';
        await challenge.save();

        res.status(200).json({
            message: 'Evaluation phase started successfully!',
            challenge
        });
    } catch (error) {
        console.error("Error starting evaluation:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/challenges/:id/sandbox
// Nodal Officer changes status from EVALUATING to SANDBOX_ACTIVE
// This formally unlocks Envelope B for Nodal Officers
exports.startSandbox = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }

        const challenge = await Challenge.findById(id);

        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        if (challenge.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only activate sandbox for challenges you created.' });
        }

        if (challenge.status !== 'EVALUATING') {
            return res.status(400).json({ message: 'Challenge must be in EVALUATING phase before entering Sandbox.' });
        }

        challenge.status = 'SANDBOX_ACTIVE';
        await challenge.save();

        res.status(200).json({
            message: 'Sandbox phase activated successfully! Financial envelopes are now visible to Nodal Officers.',
            challenge
        });
    } catch (error) {
        console.error("Error activating sandbox:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// PATCH /api/challenges/:id/shortlist-top-3
// Nodal Officer picks the top 3 OFFICER_EVALUATED proposals and moves them to SHORTLISTED
exports.shortlistTop3 = async (req, res) => {
    try {
        const { id } = req.params;
        const Challenge = require('../models/Challenge');
        const Proposal = require('../models/Proposal');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }

        const challenge = await Challenge.findById(id);
        if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
        
        if (challenge.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: You can only shortlist for your own challenges.' });
        }

        // Fetch all evaluated proposals for this challenge, sorted by score descending
        const proposals = await Proposal.find({ 
            challenge: id, 
            status: 'OFFICER_EVALUATED' 
        }).sort({ finalWeightedScore: -1 });

        if (proposals.length === 0) {
            return res.status(400).json({ message: 'No proposals have finished both Jury and Officer evaluation yet.' });
        }

        const top3 = proposals.slice(0, 3);
        const rest = proposals.slice(3);

        // Mark top 3 as SHORTLISTED
        for (const p of top3) {
            p.status = 'SHORTLISTED';
            await p.save();
        }

        // Mark rest as REJECTED
        for (const p of rest) {
            p.status = 'REJECTED';
            await p.save();
        }

        res.status(200).json({
            message: `Successfully shortlisted Top ${top3.length} proposals.`,
            shortlisted: top3.map(p => ({
                id: p._id,
                ref: p.submissionRefNumber,
                score: p.finalWeightedScore
            })),
            rejected: rest.length
        });

    } catch (error) {
        console.error("Error in Top-3 Shortlisting:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

