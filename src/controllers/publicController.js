const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

// GET /api/challenges/public
exports.getPublicChallenges = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const challenges = await Challenge.find({ status: 'PUBLISHED' })
            .select('title problemStatementRaw publishedAt evaluationDeadline')
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Challenge.countDocuments({
            status: 'PUBLISHED'
        });

        res.status(200).json({
            challenges,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// GET /api/challenges/public/:challengeId
exports.getPublicChallengeById = async (req, res) => {
    try {
        const { challengeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(challengeId)) {
            return res.status(400).json({
                message: 'Invalid challenge ID'
            });
        }

        const challenge = await Challenge.findOne({
            _id: challengeId,
            status: 'PUBLISHED'
        })
            .select(
                'title problemStatementRaw extractedKPIs publishedAt evaluationDeadline createdBy'
            )
            .populate('createdBy', 'name organization');

        if (!challenge) {
            return res.status(404).json({
                message: 'Challenge not found or not published'
            });
        }

        res.status(200).json(challenge);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// GET /api/challenges/public/:challengeId/status
exports.getChallengeStatus = async (req, res) => {
    try {
        const { challengeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(challengeId)) {
            return res.status(400).json({
                message: 'Invalid challenge ID'
            });
        }

        const challenge = await Challenge.findById(challengeId)
            .select('status');

        if (!challenge) {
            return res.status(404).json({
                message: 'Challenge not found'
            });
        }

        res.status(200).json({
            status: challenge.status
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};