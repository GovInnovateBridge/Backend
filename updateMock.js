require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to DB');
    const result = await User.findByIdAndUpdate('6a9e31931aa65d8d74705895', { hasCompletedTrl: true, verifiedTrlScore: 9 }, { new: true });
    console.log('Updated mock user:', result.email, 'hasCompletedTrl:', result.hasCompletedTrl);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
