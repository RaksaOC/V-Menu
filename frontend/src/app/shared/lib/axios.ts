// src/app/shared/lib/axios.ts
import axios from 'axios';
import {auth} from '../firebase/config';

// Create an Axios instance
const api = axios.create({
    baseURL: '/', // default to same origin
});

// Add a request interceptor
api.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default api;
