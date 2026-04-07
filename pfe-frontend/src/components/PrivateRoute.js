import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import API from '../services/api';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, allowedRoles }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async (retryCount = 0) => {
            try {
                const response = await API.get('/auth/check');
                
                if (!isMounted) return;

                if (response.data.authentifie) {
                    const userRole = response.data.role; // Rôle renvoyé par Spring Boot (ex: 'UTILISATEUR')
                    
                    // 🛡️ Vérification si les rôles autorisés ont été spécifiés
                    if (allowedRoles && allowedRoles.length > 0) {
                        if (!allowedRoles.includes(userRole)) {
                            console.warn(`[Auth] Rôle insuffisant. Requis: ${allowedRoles}, Reçu: ${userRole}`);
                            setIsAuthorized(false);
                            return;
                        }
                    }
                    
                    setIsAuthorized(true); // Autorisé !
                } else {
                    handleFailure(retryCount);
                }
            } catch (error) {
                if (isMounted) handleFailure(retryCount);
            }
        };

        const handleFailure = (retryCount) => {
            if (retryCount < 1) {
                console.warn("[Auth] Premier échec de session, tentative de secours dans 1.5s...");
                setTimeout(() => {
                    if (isMounted) checkAuth(retryCount + 1);
                }, 1500);
            } else {
                console.error("[Auth] Échec définitif de vérification de session.");
                setIsAuthorized(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 👈 Tableau vide pour empêcher la boucle infinie !

    if (isAuthorized === null) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/" replace />; 
    }

    return children;
};

export default PrivateRoute;