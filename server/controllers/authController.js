const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_eventora';

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
};

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const normalizeEmail = (email) => email.trim().toLowerCase();

const sendActionOTP = async (email, action) => {
    const otp = generateOTP();
    await OTP.deleteMany({ email, action });
    await OTP.create({ email, otp, action });

    try {
        await sendOTPEmail(email, otp, action);
    } catch (error) {
        await OTP.deleteMany({ email, action });
        throw error;
    }
};

const findLatestOTP = async (email, action) => {
    return OTP.findOne({ email, action }).sort({ createdAt: -1 });
};

const userResponse = (user, message) => ({
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user.id, user.role),
    ...(message ? { message } : {})
});

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const normalizedEmail = normalizeEmail(email);
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            if (!user.isVerified) {
                await sendActionOTP(normalizedEmail, 'account_verification');
                return res.status(200).json({
                    message: 'Account already exists but is not verified. A new verification code has been sent to your email.',
                    needsVerification: true,
                    email: normalizedEmail
                });
            }
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'user',
            isVerified: false
        });

        await sendActionOTP(normalizedEmail, 'account_verification');

        return res.status(201).json({
            message: 'Registration successful. A verification code has been sent to your email.',
            needsVerification: true,
            email: normalizedEmail
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({
            message: 'Unable to complete registration. Please confirm email settings and try again.',
            error: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (!user.isVerified) {
            await sendActionOTP(normalizedEmail, 'account_verification');
            return res.status(403).json({
                message: 'Account not verified. A new verification code has been sent to your email.',
                needsVerification: true,
                email: normalizedEmail
            });
        }

        return res.json(userResponse(user));
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            message: 'Unable to complete login. Please try again.',
            error: error.message
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP code are required.' });
        }

        const normalizedEmail = normalizeEmail(email);
        const cleanOtp = otp.toString().trim();
        const otpRecord = await findLatestOTP(normalizedEmail, 'account_verification');

        if (!otpRecord || otpRecord.otp !== cleanOtp) {
            return res.status(400).json({ message: 'Invalid or expired OTP code. Please check your email or request a new code.' });
        }

        const user = await User.findOneAndUpdate(
            { email: normalizedEmail },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User record not found.' });
        }

        await OTP.deleteMany({ email: normalizedEmail, action: 'account_verification' });

        return res.json(userResponse(user, 'Email verified successfully.'));
    } catch (error) {
        console.error('VerifyOTP error:', error);
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: 'User not found with this email.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'This account is already verified. Please log in with your password.' });
        }

        await sendActionOTP(normalizedEmail, 'account_verification');

        return res.json({ message: 'A new verification code has been sent to your email.' });
    } catch (error) {
        console.error('sendOTP error:', error);
        return res.status(500).json({
            message: 'Unable to send verification code. Please try again.',
            error: error.message
        });
    }
};

exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'No account exists with this email address.' });
        }

        await sendActionOTP(normalizedEmail, 'password_reset');

        return res.json({
            message: 'Password reset code sent to your email.',
            email: normalizedEmail
        });
    } catch (error) {
        console.error('requestPasswordReset error:', error);
        return res.status(500).json({
            message: 'Unable to send password reset code. Please try again.',
            error: error.message
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        if (!email || !otp || !password) {
            return res.status(400).json({ message: 'Email, OTP code, and new password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const normalizedEmail = normalizeEmail(email);
        const cleanOtp = otp.toString().trim();
        const otpRecord = await findLatestOTP(normalizedEmail, 'password_reset');

        if (!otpRecord || otpRecord.otp !== cleanOtp) {
            return res.status(400).json({ message: 'Invalid or expired reset code. Please check your email or request a new code.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.findOneAndUpdate(
            { email: normalizedEmail },
            { password: hashedPassword, isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User record not found.' });
        }

        await OTP.deleteMany({ email: normalizedEmail, action: 'password_reset' });

        return res.json(userResponse(user, 'Password updated successfully.'));
    } catch (error) {
        console.error('resetPassword error:', error);
        return res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
