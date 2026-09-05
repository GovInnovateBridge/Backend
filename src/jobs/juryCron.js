const cron = require('node-cron');
const Proposal = require('../models/Proposal');
const User = require('../models/User');

// Demo configuration: Runs every 20 seconds
const CRON_SCHEDULE = '*/20 * * * * *'; 
// Demo configuration: Expiry is 20 seconds (instead of 3 days)
const EXPIRY_MS = 20 * 1000;

const startJuryReassignmentCron = () => {
    console.log(`⏱️  Starting Jury Reassignment Cron Job. Running on schedule: ${CRON_SCHEDULE}`);
    
    cron.schedule(CRON_SCHEDULE, async () => {
        try {
            console.log("🔄 [Cron] Sweeping for expired Jury assignments...");
            
            const now = new Date();
            const expiryLimit = new Date(now.getTime() - EXPIRY_MS);
            
            // Find proposals that are PENDING_ACCEPTANCE and assignedAt is older than EXPIRY_MS
            const expiredProposals = await Proposal.find({
                juryReviewStatus: 'PENDING_ACCEPTANCE',
                assignedAt: { $lt: expiryLimit }
            });
            
            if (expiredProposals.length === 0) {
                console.log("🔄 [Cron] No expired assignments found.");
                return;
            }
            
            console.log(`🔄 [Cron] Found ${expiredProposals.length} expired assignments. Reassigning...`);
            
            // Get all Jury members
            const allJuryMembers = await User.find({ role: 'JURY_MEMBER' });
            if (allJuryMembers.length === 0) {
                console.error("🔄 [Cron] Error: No Jury members available in the system for reassignment.");
                return;
            }
            
            for (const proposal of expiredProposals) {
                // Find a different jury member (simulate Matchmaking fallback)
                let newJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
                
                // Try up to 5 times to find a DIFFERENT jury member
                let attempts = 0;
                while (proposal.assignedJury && newJury._id.toString() === proposal.assignedJury.toString() && attempts < 5) {
                    newJury = allJuryMembers[Math.floor(Math.random() * allJuryMembers.length)];
                    attempts++;
                }
                
                proposal.assignedJury = newJury._id;
                proposal.assignedAt = new Date(); // Reset the clock
                // juryReviewStatus remains 'PENDING_ACCEPTANCE'
                
                await proposal.save();
                
                console.log(`🔄 [Cron] Reassigned Proposal ${proposal.submissionRefNumber} to new Jury ${newJury.email}`);
                // In a real app, send an email here.
            }
            
        } catch (error) {
            console.error("🔄 [Cron] Error during reassignment sweep:", error);
        }
    });
};

module.exports = startJuryReassignmentCron;
