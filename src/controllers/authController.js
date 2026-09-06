const User = require('../models/User');
const StartupProfile = require('../models/StartupProfile');
const GovernmentProfile = require('../models/GovernmentProfile');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const { getMockDpiitData } = require('./mockGatewayController');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// 1. REGISTER 
exports.register = async (req, res) => {
    const { name, email, password, role, organization, dpiitNumber } = req.body;

    if (role === 'NODAL_OFFICER' && !email.endsWith('@gov.in') && !email.endsWith('@nic.in')) {
        return res.status(403).json({ message: 'Government roles require @gov.in or @nic.in email' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        // Step 1: Create Base User (No organization or DPIIT data here)
        user = await User.create({ 
            name,
            email, 
            password: hashedPassword, 
            role,
            otp, 
            otpExpires 
        });

        // Step 2: Create Linked Profiles
        if (role === 'STARTUP_FOUNDER') {
            let dpiitDetails = null;
            if (dpiitNumber) {
                // Fetch the verified details from Startup India Registry
                const response = getMockDpiitData(dpiitNumber);
                if (response && response.api_status === "SUCCESS") {
                    dpiitDetails = response.data;
                }
            }

            await StartupProfile.create({
                user: user._id,
                companyName: organization,
                dpiitNumber: dpiitNumber,
                dpiitDetails: dpiitDetails
            });
        } else if (role === 'NODAL_OFFICER' || role === 'JURY_MEMBER') {
            await GovernmentProfile.create({
                user: user._id,
                departmentName: organization
            });
        }

        const message = `Your SIH Sahyog verification code is: ${otp}. It expires in 10 minutes.`;
        
        await sendEmail({ email: user.email, subject: 'Account Verification OTP', message });

        res.status(200).json({ message: 'Verification OTP sent to email.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};   

// 2. VERIFY OTP 
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user || user.isVerified) return res.status(400).json({ message: 'Invalid request' });
        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Verified', token: generateToken(user._id, user.role) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. LOGIN 
exports.login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Email not verified. Check your inbox.' });
        }

        res.json({ token: generateToken(user._id, user.role) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. GET CURRENT USER
exports.getMe = async (req, res) => {
    if (!req.user) {
        return res.status(404).json({ message: 'User not found' });
    }

    let profile = null;
    if (req.user.role === 'STARTUP_FOUNDER') {
        profile = await StartupProfile.findOne({ user: req.user._id });
    } else if (req.user.role === 'NODAL_OFFICER' || req.user.role === 'JURY_MEMBER') {
        profile = await GovernmentProfile.findOne({ user: req.user._id });
    }

    res.status(200).json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        profile: profile
    });
};

// 5. GET ANY USER PROFILE (For Post-Evaluation view)
exports.getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-password -otp -otpExpires');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let profile = null;
        if (user.role === 'STARTUP_FOUNDER') {
            profile = await StartupProfile.findOne({ user: user._id });
        } else if (user.role === 'NODAL_OFFICER' || user.role === 'JURY_MEMBER') {
            profile = await GovernmentProfile.findOne({ user: user._id });
        }

        res.status(200).json({
            user,
            profile
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};