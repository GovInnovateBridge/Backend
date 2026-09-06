require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const startJuryReassignmentCron = require('./jobs/juryCron');
const startDeemedApprovalCron = require('./jobs/deemedApprovalCron');

// Connect Database
connectDB();

// Start Background Jobs
startJuryReassignmentCron();
startDeemedApprovalCron();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
