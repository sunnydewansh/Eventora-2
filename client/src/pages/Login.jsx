import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Login = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { login, verifyOTP, sendOTP } = useContext(AuthContext);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [activeOtp, setActiveOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
        }
        if (location.state?.otp) {
            setActiveOtp(location.state.otp);
            setOtp(location.state.otp);
        }
        if (location.state?.needsVerification) {
            setShowOTP(true);
            setInfoMessage('Verification OTP generated and sent. Enter the code below to log in.');
        }
    }, [location.state]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setInfoMessage('');

        const cleanEmail = email.trim().toLowerCase();

        try {
            if (!showOTP) {
                const data = await login(cleanEmail, password);
                if (data.role === 'admin') navigate('/admin');
                else navigate('/dashboard');
            } else {
                const data = await verifyOTP(cleanEmail, otp);
                if (data.role === 'admin') navigate('/admin');
                else navigate('/dashboard');
            }
        } catch (err) {
            if (err.needsVerification) {
                setShowOTP(true);
                if (err.email) setEmail(err.email);
                if (err.otp) {
                    setActiveOtp(err.otp);
                    setOtp(err.otp);
                }
                setError(err.message || 'Account not verified. A verification code has been sent to your email.');
            } else {
                setError(err.message || (typeof err === 'string' ? err : 'Authentication failed. Please check your credentials.'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!email) {
            setError('Please enter your email address to resend OTP.');
            return;
        }
        setResendLoading(true);
        setError('');
        setInfoMessage('');
        try {
            const data = await sendOTP(email.trim().toLowerCase());
            if (data.otp) {
                setActiveOtp(data.otp);
                setOtp(data.otp);
            }
            setInfoMessage(data.message || 'A new verification code has been sent to your email.');
        } catch (err) {
            setError(err.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleQuickLogin = async (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        setShowOTP(false);
        setLoading(true);
        setError('');
        setInfoMessage('');
        try {
            const data = await login(demoEmail, demoPassword);
            if (data.role === 'admin') navigate('/admin');
            else navigate('/dashboard');
        } catch (err) {
            setError(err.message || (typeof err === 'string' ? err : 'Quick login failed.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-500">
                    {showOTP ? 'Verify your email to continue' : 'Sign in to your Eventora account'}
                </p>
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
                {!showOTP ? (
                    <>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                placeholder="name@example.com"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 focus:border-gray-700 transition shadow-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 focus:border-gray-700 transition shadow-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Email</label>
                            <input
                                type="email"
                                disabled
                                className="w-full px-4 py-3 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition shadow-sm font-medium cursor-not-allowed"
                                value={email}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">6-Digit OTP Code</label>
                            {activeOtp && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-center text-xs font-semibold mb-3">
                                    Your Verification Code: <span className="text-base font-extrabold tracking-widest text-black ml-1 select-all">{activeOtp}</span>
                                </div>
                            )}
                            <input
                                type="text"
                                required
                                placeholder="123456"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm font-bold tracking-widest text-center text-xl"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength="6"
                            />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <button
                                type="button"
                                onClick={() => setShowOTP(false)}
                                className="text-gray-500 hover:text-gray-900 underline text-xs font-semibold"
                            >
                                Back to Password Login
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={resendLoading}
                                className="text-gray-900 font-bold hover:underline text-xs"
                            >
                                {resendLoading ? 'Sending...' : 'Resend Code'}
                            </button>
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-lg hover:bg-black focus:ring-4 focus:ring-gray-200 transition shadow-md"
                >
                    {loading ? 'Processing...' : (showOTP ? 'Verify Email & Log In' : 'Sign In')}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 text-center mb-3">Quick Demo Access</p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handleQuickLogin('user@eventora.com', 'password123')}
                        disabled={loading}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-3 rounded-lg transition text-center"
                    >
                        Try Demo User
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickLogin('admin@eventora.com', 'password123')}
                        disabled={loading}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-3 rounded-lg transition text-center"
                    >
                        Try Demo Admin
                    </button>
                </div>
            </div>

            <p className="text-center mt-8 text-gray-600">
                Don't have an account? <Link to="/register" className="text-gray-900 font-bold hover:underline">Sign up</Link>
            </p>
        </div>
    );
};

export default Login;
