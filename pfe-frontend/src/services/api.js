import axios from 'axios';

const API = axios.create({
    baseURL: 'https://localhost:8443/api',
    withCredentials: true, // Crucial pour s'échanger les cookies HttpOnly
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        const urlReq = error.config?.url || "";
        const isAuthRoute = urlReq.includes('/connexion') || urlReq.includes('/verifier-otp') || urlReq.includes('/auth/check');

        // On ne redirige vers /connexion automatiquement QUE si ce n'est pas une route de login/OTP
        if (error.response && error.response.status === 401 && !isAuthRoute) {
            window.location.href = '/connexion';
        }
        return Promise.reject(error);
    }
);

export default API;