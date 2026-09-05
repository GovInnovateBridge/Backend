const cron = require("node-cron");
const Escrow = require("../models/Escrow");
const { processPFMSDisbursement } = require("../controllers/mockGatewayController");

const startDeemedApprovalCron = () => {
    // Runs every hour on the hour
    cron.schedule("0 * * * *", async () => {
        try {
            const now = new Date();
            const escrows = await Escrow.find({ "milestones.status": "CLAIMED" });
            
            for (const escrow of escrows) {
                let updated = false;
                for (const m of escrow.milestones) {
                    if (m.status === "CLAIMED" && m.deemedApprovalDeadline && m.deemedApprovalDeadline <= now) {
                        m.status = "DEEMED_APPROVED";
                        
                        // Automatically trigger PFMS disbursement simulation
                        const tx = processPFMSDisbursement(escrow._id, m.code, m.amount);
                        
                        m.status = "RELEASED";
                        m.pfmsTransactionRef = tx.transactionRef;
                        m.releasedAt = now;
                        updated = true;
                    }
                }
                if (updated) {
                    await escrow.save();
                }
            }
        } catch (error) {
            console.error("Error in deemed approval cron job:", error);
        }
    });
};

module.exports = startDeemedApprovalCron;