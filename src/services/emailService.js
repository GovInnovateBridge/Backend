const nodemailer = require('nodemailer');

// Set up transporter (similar to how we wrap ML clients)
// This makes it extremely easy for a developer to just drop in their SMTP credentials later in .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'demo_user',
        pass: process.env.SMTP_PASS || 'demo_pass'
    }
});

/**
 * Sends an email notification to a user.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body content
 */
const sendEmail = async (to, subject, text) => {
    try {
        // If SMTP credentials aren't really provided, just mock it to avoid crashing
        if (!process.env.SMTP_HOST) {
            console.log(`📧 [MOCK EMAIL SENT] To: ${to} | Subject: ${subject}`);
            return true;
        }

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"GovInnovateBridge Notifications" <no-reply@govinnovate.in>',
            to,
            subject,
            text
        });
        
        console.log(`📧 [EMAIL SENT] Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ [EMAIL ERROR] Failed to send email:", error.message);
        // We don't want to break the whole flow if email fails
        return false;
    }
};

module.exports = {
    sendEmail
};
