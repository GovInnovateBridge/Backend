const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const { extractKPIs } = require('../utils/mlAdapter');

// POST /api/challenges/create
// Nodal Officer creates a new challenge (status defaults to DRAFT)
exports.createChallenge = async (req, res) => {
    try {
        const { title, problemStatementRaw, scopeOfWork, expectedDeliverables, pilotBudgetInr, evaluationDeadline, category, departmentName } = req.body;

        // Generate a random PS Number if not provided (mock generation)
        const psNumber = req.body.psNumber || `PS-${new Date().getFullYear()}-MH-${Math.floor(Math.random() * 1000)}`;

        // ML Call: Auto-extract KPIs from the problem statement
        const extractedKPIs = await extractKPIs(problemStatementRaw);

        const newChallenge = new Challenge({
            psNumber,
            departmentName,
            category,
            title,
            problemStatementRaw,
            scopeOfWork,
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
        await challenge.save();

        res.status(200).json({
            message: 'Challenge published successfully!',
            challenge
        });
    } catch (error) {
        console.error("Error publishing challenge:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
