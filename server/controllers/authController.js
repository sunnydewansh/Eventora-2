const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'supersecretjwtkey_eventora', { expiresIn: '30d' });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email, and password.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            if (!user.isVerified) {
                // User exists but isn't verified yet - send new OTP
                const otp = generateOTP();
                await OTP.deleteMany({ email: normalizedEmail, action: 'account_verification' });
                await OTP.create({ email: normalizedEmail, otp, action: 'account_verification' });

                try {
                    await sendOTPEmail(normalizedEmail, otp, 'account_verification');
                } catch (emailErr) {
                    console.error('Failed to send OTP email during register re-verification:', emailErr.message);
                }
                console.log(`\n=========================================\n[VERIFICATION OTP] Email: ${normalizedEmail} | OTP: ${otp}\n=========================================\n`);

                return res.status(200).json({
                    message: 'Account already created but not verified. A new verification OTP has been sent to your email.',
                    needsVerification: true,
                    email: normalizedEmail,
                    otp: otp
                });
            }
            return res.status(400).json({ message: 'User already exists with this email' });
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

        // Generate OTP
        const otp = generateOTP();
        await OTP.deleteMany({ email: normalizedEmail, action: 'account_verification' });
        await OTP.create({ email: normalizedEmail, otp, action: 'account_verification' });

        try {
            await sendOTPEmail(normalizedEmail, otp, 'account_verification');
        } catch (emailErr) {
            console.error('Failed to send verification OTP email:', emailErr.message);
        }
        console.log(`\n=========================================\n[VERIFICATION OTP] Email: ${normalizedEmail} | OTP: ${otp}\n=========================================\n`);

        res.status(201).json({
            message: 'Registration successful! Verification code sent to your email.',
            needsVerification: true,
            email: normalizedEmail,
            otp: otp
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials. User not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials. Password incorrect.' });
        }

        // If user is not verified, require OTP verification
        if (!user.isVerified) {
            const otp = generateOTP();
            await OTP.deleteMany({ email: normalizedEmail, action: 'account_verification' });
            await OTP.create({ email: normalizedEmail, otp, action: 'account_verification' });

            try {
                await sendOTPEmail(normalizedEmail, otp, 'account_verification');
            } catch (emailErr) {
                console.error('Failed to send OTP email during login:', emailErr.message);
            }
            console.log(`\n=========================================\n[VERIFICATION OTP] Email: ${normalizedEmail} | OTP: ${otp}\n=========================================\n`);

            return res.status(400).json({
                message: 'Account not verified. A new OTP has been sent to your email.',
                needsVerification: true,
                email: normalizedEmail,
                otp: otp
            });
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP code are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const cleanOtp = otp.toString().trim();

        const otpRecord = await OTP.findOne({
            email: normalizedEmail,
            action: 'account_verification'
        }).sort({ createdAt: -1 });

        if (!otpRecord || otpRecord.otp !== cleanOtp) {
            return res.status(400).json({ message: 'Invalid or expired OTP code. Please check or request a new code.' });
        }

        const user = await User.findOneAndUpdate(
            { email: normalizedEmail },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User record not found.' });
        }

        // Delete verified OTP record
        await OTP.deleteMany({ email: normalizedEmail, action: 'account_verification' });

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role),
            message: 'Email verified successfully!'
        });
    } catch (error) {
        console.error('VerifyOTP error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: 'User not found with this email.' });
        }

        const otp = generateOTP();
        await OTP.deleteMany({ email: normalizedEmail, action: 'account_verification' });
        await OTP.create({ email: normalizedEmail, otp, action: 'account_verification' });

        try {
            await sendOTPEmail(normalizedEmail, otp, 'account_verification');
        } catch (emailErr) {
            console.error('Failed to resend OTP email:', emailErr.message);
        }
        console.log(`\n=========================================\n[RESENT OTP] Email: ${normalizedEmail} | OTP: ${otp}\n=========================================\n`);

        res.json({
            message: 'A new verification code has been sent to your email.',
            otp: otp
        });
    } catch (error) {
        console.error('sendOTP error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
