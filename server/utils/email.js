const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
        const info = await transporter.sendMail(mailOptions);
        console.log('[SMTP SUCCESS] Booking email sent:', info.messageId);
        return info;
    } catch (err) {
        console.error('[SMTP BOOKING ERROR]:', err.message || err);
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = type === 'account_verification'
            ? 'Verify your Eventora Account'
            : 'Eventora Booking Verification';

        const msg = type === 'account_verification'
            ? 'Please use the following OTP to verify your Eventora account.'
            : 'Please use the following OTP to verify your event booking.';

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

        const info = await transporter.sendMail(mailOptions);
        console.log(`[SMTP SUCCESS] OTP sent to ${userEmail}:`, info.messageId);
        return info;
    } catch (err) {
        console.error('[SMTP OTP ERROR]:', err.message || err);
        console.log(`[SMTP FALLBACK] Generated OTP for ${userEmail}: ${otp}`);
    }
};

module.exports = {
    sendBookingEmail,
    sendOTPEmail
};