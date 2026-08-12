const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const resendApiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : null;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
});

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    const html = `
        <h2>Hi ${userName}!</h2>
        <p>Your booking for <strong>${eventTitle}</strong> is successfully confirmed.</p>
        <p>Thank you for choosing Eventora.</p>
    `;

    if (resend) {
        try {
            const data = await resend.emails.send({
                from: 'Eventora <onboarding@resend.dev>',
                to: [userEmail],
                subject: `Booking Confirmed: ${eventTitle}`,
                html
            });
            console.log('[RESEND SUCCESS] Booking email sent:', data);
            return data;
        } catch (err) {
            console.error('[RESEND BOOKING ERROR]:', err.message || err);
        }
    }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            const info = await transporter.sendMail({
                from: `Eventora <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: `Booking Confirmed: ${eventTitle}`,
                html
            });
            console.log('[NODEMAILER SUCCESS] Booking email sent:', info.messageId);
            return info;
        } catch (err) {
            console.error('[NODEMAILER BOOKING ERROR]:', err.message || err);
        }
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    const title = type === 'account_verification'
        ? 'Verify your Eventora Account'
        : 'Eventora Booking Verification';

    const msg = type === 'account_verification'
        ? 'Please use the following OTP to verify your Eventora account.'
        : 'Please use the following OTP to verify your event booking.';

    const html = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #111;">${title}</h2>
            <p style="color: #555; font-size: 16px;">${msg}</p>
            <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; background: #f4f4f4; width: max-content; letter-spacing: 5px;">
                ${otp}
            </div>
            <p style="color: #999; font-size: 12px;">This code expires in 5 minutes.</p>
        </div>
    `;

    // Try Resend API first
    if (resend) {
        try {
            const data = await resend.emails.send({
                from: 'Eventora <onboarding@resend.dev>',
                to: [userEmail],
                subject: title,
                html
            });
            console.log(`[RESEND SUCCESS] OTP sent to ${userEmail}:`, data);
            return data;
        } catch (resendError) {
            console.error('[RESEND OTP ERROR]:', resendError.message || resendError);
        }
    }

    // Try Nodemailer fallback
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            const info = await transporter.sendMail({
                from: `Eventora <${process.env.EMAIL_USER}>`,
                to: userEmail,
                subject: title,
                html
            });
            console.log(`[NODEMAILER SUCCESS] OTP sent to ${userEmail}:`, info.messageId);
            return info;
        } catch (smtpError) {
            console.error('[NODEMAILER OTP ERROR]:', smtpError.message || smtpError);
        }
    }

    console.log(`[EMAIL DISPATCH] OTP for ${userEmail}: ${otp}`);
};

module.exports = {
    sendBookingEmail,
    sendOTPEmail
};