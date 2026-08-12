import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            setUser(JSON.parse(userInfo));
        }
        setLoading(false);
    }, []);

    const getError = (error, fallback) => {
        if (error.response?.data) return error.response.data;
        if (error.request) return { message: 'Unable to reach the server. Please try again in a moment.' };
        return { message: fallback };
    };

    const saveSession = (data) => {
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
        localStorage.setItem('token', data.token);
    };

    const login = async (email, password) => {
        try {
            const { data } = await api.post('/auth/login', { email, password });
            saveSession(data);
            return data;
        } catch (error) {
            throw getError(error, 'Login failed');
        }
    };

    const register = async (name, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { name, email, password });
            if (data.token) {
                saveSession(data);
            }
            return data;
        } catch (error) {
            throw getError(error, 'Registration failed');
        }
    };

    const verifyOTP = async (email, otp) => {
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });
            if (data.token) {
                saveSession(data);
            }
            return data;
        } catch (error) {
            throw getError(error, 'OTP verification failed');
        }
    };

    const sendOTP = async (email) => {
        try {
            const { data } = await api.post('/auth/send-otp', { email });
            return data;
        } catch (error) {
            throw getError(error, 'Failed to send OTP');
        }
    };

    const forgotPassword = async (email) => {
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            return data;
        } catch (error) {
            throw getError(error, 'Failed to send password reset code');
        }
    };

    const resetPassword = async (email, otp, password) => {
        try {
            const { data } = await api.post('/auth/reset-password', { email, otp, password });
            if (data.token) {
                saveSession(data);
            }
            return data;
        } catch (error) {
            throw getError(error, 'Failed to reset password');
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            register,
            verifyOTP,
            sendOTP,
            forgotPassword,
            resetPassword,
            logout,
            loading
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
