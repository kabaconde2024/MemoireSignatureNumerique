import axios from 'axios';

// URL de base selon l'environnement
const getBaseURL = () => {
  // Production (Render)
  if (process.env.NODE_ENV === 'production') {
    return `${process.env.REACT_APP_API_URL}/api`;
  }
  // Développement local
  return 'http://localhost:8080/api';
};

const API = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true,  // ✅ CHANGER de false à true
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Intercepteur pour ajouter le token JWT (optionnel maintenant car cookie est utilisé)
API.interceptors.request.use(
    (config) => {
        // ⚠️ Optionnel: Garder pour fallback mais backend privilégie le cookie
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs
API.interceptors.response.use(
    (response) => response,
    (error) => {
        const urlReq = error.config?.url || "";
        const isAuthRoute = urlReq.includes('/connexion') || 
                           urlReq.includes('/verifier-otp') || 
                           urlReq.includes('/auth/check') ||
                           urlReq.includes('/login');

        // Gestion des erreurs 401 (non authentifié)
        if (error.response?.status === 401 && !isAuthRoute) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            localStorage.removeItem('user_info');
            localStorage.removeItem('userId');
            localStorage.removeItem('organisationId');
            
            // Supprimer le cookie aussi
            document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            window.location.href = '/connexion';
        }
        
        // Gestion des erreurs 403 (non autorisé)
        if (error.response?.status === 403) {
            console.error('Accès non autorisé');
        }
        
        console.error('API Error:', error.response?.data || error.message);
        
        return Promise.reject(error);
    }
);

export default API;