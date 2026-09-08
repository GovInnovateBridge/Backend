const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // If credentials aren't provided, mock the email to avoid crashing registration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`📧 [MOCK EMAIL SENT] To: ${options.email} | Subject: ${options.subject}`);
        console.log(`Message content:\n${options.message}`);
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `SIH Sahyog <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;