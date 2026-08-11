const nodemailer = require('nodemailer');

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

const FROM_EMAIL = `Eventora <${process.env.EMAIL_USER}>`;

// Helper timeout to prevent any email send from hanging HTTP requests
const withTimeout = (promise, ms = 4000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Email send timeout after ${ms}ms`)), ms)
        )
    ]);
};

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        const info = await withTimeout(transporter.sendMail({
            from: FROM_EMAIL,
            to: userEmail,
            subject: `Booking Confirmed: ${eventTitle}`,
            html: `
                <h2>Hi ${userName}!</h2>
                <p>
                    Your booking for the event
                    <strong>${eventTitle}</strong>
                    is successfully confirmed.
                </p>
                <p>Thank you for choosing Eventora.</p>
            `
        }), 5000);

        console.log('Booking email sent successfully:', info.messageId);
        return info;

    } catch (error) {
        console.error('BOOKING EMAIL ERROR:', error.message || error);
        throw error;
    }
};


const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title =
            type === 'account_verification'
                ? 'Verify your Eventora Account'
                : 'Eventora Booking Verification';

        const msg =
            type === 'account_verification'
                ? 'Please use the following OTP to verify your new Eventora account.'
                : 'Please use the following OTP to verify and confirm your event booking.';

        const info = await withTimeout(transporter.sendMail({
            from: FROM_EMAIL,
            to: userEmail,
            subject: title,
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 20px;
                ">
                    <h2 style="color: #111;">
                        ${title}
                    </h2>

                    <p style="
                        color: #555;
                        font-size: 16px;
                    ">
                        ${msg}
                    </p>

                    <div style="
                        margin: 20px auto;
                        padding: 15px;
                        font-size: 24px;
                        font-weight: bold;
                        background: #f4f4f4;
                        width: max-content;
                        letter-spacing: 5px;
                    ">
                        ${otp}
                    </div>

                    <p style="
                        color: #999;
                        font-size: 12px;
                    ">
                        This code expires in 5 minutes.
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
            `
        }), 5000);

        console.log(`OTP sent successfully to ${userEmail}:`, info.messageId);
        return info;

    } catch (error) {
        console.error('OTP EMAIL ERROR:', error.message || error);
        throw error;
    }
};


module.exports = {
    sendBookingEmail,
    sendOTPEmail
};