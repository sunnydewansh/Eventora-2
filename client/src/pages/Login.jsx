import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Login = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        login,
        verifyOTP,
        sendOTP,
        forgotPassword,
        resetPassword
    } = useContext(AuthContext);

    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
        }
        if (location.state?.needsVerification) {
            setMode('verify');
            setInfoMessage(location.state.message || 'A verification code has been sent to your email.');
        }
    }, [location.state]);

    const normalizeEmail = () => email.trim().toLowerCase();

    const navigateAfterAuth = (data) => {
        navigate(data.role === 'admin' ? '/admin' : '/dashboard');
    };

    const resetMessages = () => {
        setError('');
        setInfoMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        const cleanEmail = normalizeEmail();

        try {
            if (mode === 'login') {
                const data = await login(cleanEmail, password);
                navigateAfterAuth(data);
                return;
            }

            if (mode === 'verify') {
                const data = await verifyOTP(cleanEmail, otp);
                navigateAfterAuth(data);
                return;
            }

            if (mode === 'forgot') {
                const data = await forgotPassword(cleanEmail);
                setMode('reset');
                setOtp('');
                setInfoMessage(data.message || 'Password reset code sent to your email.');
                return;
            }

            if (newPassword !== confirmPassword) {
                setError('New passwords do not match.');
                return;
            }

            const data = await resetPassword(cleanEmail, otp, newPassword);
            navigateAfterAuth(data);
        } catch (err) {
            if (err.needsVerification) {
                setMode('verify');
                if (err.email) setEmail(err.email);
                setOtp('');
                setError(err.message || 'Account not verified. A verification code has been sent to your email.');
            } else {
                setError(err.message || (typeof err === 'string' ? err : 'Authentication failed. Please try again.'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }

        setResendLoading(true);
        resetMessages();

        try {
            const cleanEmail = normalizeEmail();
            const data = mode === 'reset'
                ? await forgotPassword(cleanEmail)
                : await sendOTP(cleanEmail);

            setOtp('');
            setInfoMessage(data.message || 'A new code has been sent to your email.');
        } catch (err) {
            setError(err.message || 'Failed to resend code. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleQuickLogin = async (demoEmail, demoPassword) => {
        setMode('login');
        setEmail(demoEmail);
        setPassword(demoPassword);
        setLoading(true);
        resetMessages();

        try {
            const data = await login(demoEmail, demoPassword);
            navigateAfterAuth(data);
        } catch (err) {
            setError(err.message || 'Demo login failed.');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        resetMessages();
    };

    const title = {
        login: 'Welcome Back',
        verify: 'Verify Your Email',
        forgot: 'Reset Password',
        reset: 'Create New Password'
    }[mode];

    const subtitle = {
        login: 'Sign in to your Eventora account',
        verify: 'Enter the 6-digit code sent to your email',
        forgot: 'We will email you a reset code',
        reset: 'Use your emailed code to update your password'
    }[mode];

    return (
        <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-500">{subtitle}</p>
            </div>

            {infoMessage && (
                <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-lg mb-6 text-center shadow-inner border border-emerald-100 text-sm font-medium">
                    {infoMessage}
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 p-3.5 rounded-lg mb-6 text-center shadow-inner border border-red-100 text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        disabled={mode === 'verify'}
                        className={`w-full px-4 py-3 rounded-lg border transition shadow-sm ${
                            mode === 'verify'
                                ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed'
                                : 'border-gray-300 focus:ring-2 focus:ring-gray-700 focus:border-gray-700'
                        }`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                {mode === 'login' && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-700">Password</label>
                            <button
                                type="button"
                                onClick={() => switchMode('forgot')}
                                className="text-xs font-bold text-gray-900 hover:underline"
                            >
                                Forgot password?
                            </button>
                        </div>
                        <input
                            type="password"
                            required
                            placeholder="********"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 focus:border-gray-700 transition shadow-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                )}

                {(mode === 'verify' || mode === 'reset') && (
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">6-Digit Email Code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="123456"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm font-bold tracking-widest text-center text-xl"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength="6"
                            autoComplete="one-time-code"
                        />
                    </div>
                )}

                {mode === 'reset' && (
                    <>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                            <input
                                type="password"
                                required
                                minLength="6"
                                placeholder="Minimum 6 characters"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 focus:border-gray-700 transition shadow-sm"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                required
                                minLength="6"
                                placeholder="Repeat new password"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 focus:border-gray-700 transition shadow-sm"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </>
                )}

                {(mode === 'verify' || mode === 'reset') && (
                    <div className="flex justify-between items-center text-sm">
                        <button
                            type="button"
                            onClick={() => switchMode('login')}
                            className="text-gray-500 hover:text-gray-900 underline text-xs font-semibold"
                        >
                            Back to login
                        </button>
                        <button
                            type="button"
                            onClick={handleResendOTP}
                            disabled={resendLoading}
                            className="text-gray-900 font-bold hover:underline text-xs disabled:opacity-60"
                        >
                            {resendLoading ? 'Sending...' : 'Resend Code'}
                        </button>
                    </div>
                )}

                {mode === 'forgot' && (
                    <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-gray-500 hover:text-gray-900 underline text-xs font-semibold"
                    >
                        Back to login
                    </button>
                )}

                <button
                    type="submit"
                    disabled={loading || resendLoading}
                    className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-lg hover:bg-black focus:ring-4 focus:ring-gray-200 transition shadow-md disabled:opacity-70"
                >
                    {loading
                        ? 'Processing...'
                        : {
                            login: 'Sign In',
                            verify: 'Verify Email & Log In',
                            forgot: 'Send Reset Code',
                            reset: 'Update Password & Log In'
                        }[mode]}
                </button>
            </form>

            {mode === 'login' && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 text-center mb-3">Quick Demo Access</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => handleQuickLogin('user@eventora.com', 'password123')}
                            disabled={loading}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-3 rounded-lg transition text-center disabled:opacity-70"
                        >
                            Try Demo User
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickLogin('admin@eventora.com', 'password123')}
                            disabled={loading}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-3 rounded-lg transition text-center disabled:opacity-70"
                        >
                            Try Demo Admin
                        </button>
                    </div>
                </div>
            )}

            <p className="text-center mt-8 text-gray-600">
                Don't have an account? <Link to="/register" className="text-gray-900 font-bold hover:underline">Sign up</Link>
            </p>
        </div>
    );
};

export default Login;
