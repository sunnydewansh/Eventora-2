const nodemailer = require('nodemailer');

const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials are not configured. Set EMAIL_USER and EMAIL_PASS.');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        const mailOptions = {
            from: `Eventora <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Booking Confirmed: ${eventTitle}`,
            html: `
                <h2>Hi ${userName}!</h2>
                <p>Your booking for <strong>${eventTitle}</strong> is successfully confirmed.</p>
                <p>Thank you for choosing Eventora.</p>
            `
        };
        const info = await getTransporter().sendMail(mailOptions);
        console.log('[SMTP SUCCESS] Booking email sent:', info.messageId);
        return info;
    } catch (err) {
        console.error('[SMTP BOOKING ERROR]:', err.message || err);
        throw err;
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const titles = {
            account_verification: 'Verify your Eventora Account',
            event_booking: 'Eventora Booking Verification',
            password_reset: 'Reset your Eventora Password'
        };

        const messages = {
            account_verification: 'Please use the following OTP to verify your Eventora account.',
            event_booking: 'Please use the following OTP to verify your event booking.',
            password_reset: 'Please use the following OTP to reset your Eventora password.'
        };

        const title = titles[type] || 'Eventora Verification Code';
        const msg = messages[type] || 'Please use the following OTP to continue.';

        const mailOptions = {
            from: `Eventora <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: title,
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2 style="color: #111;">${title}</h2>
                    <p style="color: #555; font-size: 16px;">${msg}</p>
                    <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; background: #f4f4f4; width: max-content; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p style="color: #999; font-size: 12px;">This code expires in 5 minutes.</p>
                </div>
            `
        };

        const info = await getTransporter().sendMail(mailOptions);
        console.log(`[SMTP SUCCESS] OTP sent to ${userEmail}:`, info.messageId);
        return info;
    } catch (err) {
        console.error('[SMTP OTP ERROR]:', err.message || err);
        throw err;
    }
};

module.exports = {
    sendBookingEmail,
    sendOTPEmail
};
