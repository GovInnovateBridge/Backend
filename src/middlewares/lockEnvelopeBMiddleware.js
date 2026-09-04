const Challenge = require('../models/Challenge');
const Proposal = require('../models/Proposal');

const lockEnvelopeB = async (req, res, next) => {
    // Default state: strictly locked to prevent data leaks
    req.envelopeBUnlocked = false;

    try {
        // Find the relevant challenge ID depending on the route structure
        let challengeId = req.params.challengeId;

        // If the route is accessing a specific proposal (e.g., /proposals/:id)
        if (!challengeId && req.params.id) {
            const proposal = await Proposal.findById(req.params.id);
            if (proposal) {
                challengeId = proposal.challenge;
            }
        }

        if (challengeId) {
            const challenge = await Challenge.findById(challengeId);
            
            if (challenge) {
                const now = new Date();
                const isEvaluationActive = challenge.status === 'EVALUATING' || 
                                          (challenge.evaluationDeadline && challenge.evaluationDeadline > now);

                // Rule 1: Jury members can only unlock during active evaluation windows
                if (req.user.role === 'JURY_MEMBER' && isEvaluationActive) {
                    req.envelopeBUnlocked = true;
                } 
                // Rule 2: Nodal Officers can unlock during evaluation or active sandbox phases
                else if (req.user.role === 'NODAL_OFFICER') {
                    if (challenge.status === 'EVALUATING' || challenge.status === 'SANDBOX_ACTIVE') {
                        req.envelopeBUnlocked = true;
                    }
                }
            }
        }
    } catch (error) {
        console.error("Vault Lock Error:", error.message);
        // Fail-secure: if anything goes wrong, keep the envelope locked
    }

    next();
};

module.exports = lockEnvelopeB;