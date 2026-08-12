const express = require('express');
const router = express.Router();
const { register, login, verifyOTP, sendOTP } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/send-otp', sendOTP);

module.exports = router;
