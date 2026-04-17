import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// URL de l'API backend
const API_BASE_URL = 'https://trustsign-backend-3zsj.onrender.com';

const PrivateRoute = ({ children, allowedRoles }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                // Utilisation de fetch avec credentials pour envoyer le cookie
                const response = await fetch(`${API_BASE_URL}/api/auth/check`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (!isMounted) return;

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.authentifie) {
                        const role = data.role;
                        setUserRole(role);
                        
                        // Vérification du rôle
                        if (allowedRoles && allowedRoles.length > 0) {
                            if (!allowedRoles.includes(role)) {
                                console.warn(`[Auth] Rôle insuffisant: ${role}`);
                                setIsAuthorized(false);
                                return;
                            }
                        }
                        
                        console.log(`[Auth] ✅ Accès accordé pour: ${role}`);
                        setIsAuthorized(true);
                    } else {
                        console.warn('[Auth] Session invalide ou expirée');
                        setIsAuthorized(false);
                    }
                } else {
                    console.warn('[Auth] Session invalide ou expirée');
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error('[Auth] Erreur lors de la vérification du cookie:', error.message);
                if (isMounted) setIsAuthorized(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, [allowedRoles]);

    if (isAuthorized === null) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;