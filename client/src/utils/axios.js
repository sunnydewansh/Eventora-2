import axios from 'axios';

const getBaseUrl = () => {
    const rawUrl = import.meta.env.VITE_API_URL;
    if (!rawUrl || rawUrl.trim() === '') {
        return '/api';
    }
    const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;