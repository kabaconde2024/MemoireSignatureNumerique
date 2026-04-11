import React, { useState } from 'react';
import { 
    Box, TextField, Button, Alert, InputAdornment, 
    CircularProgress, Typography, Link, Divider 
} from '@mui/material';
import { Lock, Email, Security } from '@mui/icons-material';
import API from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import GoogleLoginNative from '../../components/GoogleLoginNative';

const Connexion = ({ onSwitch, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [motDePasse, setMotDePasse] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [isMfaRequired, setIsMfaRequired] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const location = useLocation();

    const query = new URLSearchParams(location.search);
    const redirectPath = query.get('redirect');

    const fieldStyle = {
        input: { color: '#000' },
        label: { color: '#000', fontWeight: 600 },
        "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: 'rgba(0, 0, 0, 0.2)' },
            "&:hover fieldset": { borderColor: '#000' },
            "&.Mui-focused fieldset": { borderColor: '#3b82f6' }
        }
    };

    const redirectUserByRole = (role) => {
        if (redirectPath && redirectPath !== '/' && !redirectPath.includes('/connexion')) {
            navigate(decodeURIComponent(redirectPath));
            return;
        }

        const activeRole = role || localStorage.getItem('role'); 

        if (activeRole === 'SUPER_ADMIN') navigate('/super-admin-dashboard');
        else if (activeRole === 'ADMIN_ENTREPRISE') navigate('/admin-dashboard');
        else if (activeRole === 'EMPLOYE') navigate('/employe-dashboard');
        else if (activeRole === 'UTILISATEUR') navigate('/user-dashboard');
        else navigate('/user-dashboard');
    };

   const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
        const response = await API.post('/connexion', { 
            email: email.trim().toLowerCase(), 
            motDePasse 
        });
        
        // ✅ Le cookie accessToken est posé AUTOMATIQUEMENT par le navigateur ici.
        // On ne stocke plus le token manuellement.

        if (response.data.necessiteMfa) {
            setIsMfaRequired(true);
        } else {
            // On garde les infos non sensibles dans le localStorage
            localStorage.setItem('role', response.data.role);
            localStorage.setItem('user_info', JSON.stringify({
                prenom: response.data.prenom,
                nom: response.data.nom,
                email: email
            }));
            
            if (onLoginSuccess) onLoginSuccess();
            redirectUserByRole(response.data.role);
        }
    } catch (err) {
        setError(err.response?.data?.erreur || "Identifiants incorrects.");
    } finally { setLoading(false); }
};


  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
        const response = await API.post('/verifier-otp', { 
            email: email.trim().toLowerCase(), 
            code: otpCode.trim() 
        });
        
        // ✅ Le cookie est géré par le header Set-Cookie du backend
        
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('user_info', JSON.stringify({
            prenom: response.data.prenom,
            nom: response.data.nom,
            email: response.data.email
        }));

        if (onLoginSuccess) onLoginSuccess();
        setTimeout(() => redirectUserByRole(response.data.role), 100);

    } catch (err) {
        setError("Code OTP invalide ou expiré.");
    } finally { setLoading(false); }
};

    const handleGoogleSuccess = async (googleData) => {
        setLoading(true);
        setError('');
        try {
            const response = await API.post('/auth/google', { token: googleData.credential });

            localStorage.setItem('role', response.data.role);
            localStorage.setItem('user_info', JSON.stringify({
                prenom: response.data.prenom,
                nom: response.data.nom,
                email: response.data.email
            }));

            if (onLoginSuccess) onLoginSuccess();
            redirectUserByRole(response.data.role);
        } catch (err) {
            setError("Échec de la connexion avec Google.");
        } finally { setLoading(false); }
    };

    return (
        <Box sx={{ p: 4, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(15px)', borderRadius: 6 }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="900" sx={{ color: '#000', mb: 1 }}>
                    {isMfaRequired ? "SÉCURITÉ" : "CONNEXION"}
                </Typography>
                <Box sx={{ width: 60, height: 4, bgcolor: '#3b82f6', mx: 'auto', borderRadius: 2 }} />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {!isMfaRequired ? (
                <Box>
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                        <GoogleLoginNative onSuccess={handleGoogleSuccess} />
                    </Box>
                    <Divider sx={{ mb: 3 }}>
                        <Typography variant="caption" sx={{ color: '#000', fontWeight: 600, px: 1 }}>OU AVEC EMAIL</Typography>
                    </Divider>
                    <TextField 
                        fullWidth label="Email" margin="normal" required value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: '#000' }} /></InputAdornment> }}
                        sx={fieldStyle}
                    />
                    <TextField 
                        fullWidth label="Mot de passe" type="password" margin="normal" required value={motDePasse}
                        onChange={(e) => setMotDePasse(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#000' }} /></InputAdornment> }}
                        sx={fieldStyle}
                    />
                    <Button 
                        fullWidth variant="contained" onClick={handleLogin} disabled={loading}
                        sx={{ mt: 3, py: 2, bgcolor: '#1c1212', fontWeight: '900', "&:hover": { bgcolor: '#333' } }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
                    </Button>
                    <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                        <Link onClick={() => navigate('/mot-de-passe-oublie')} sx={{ cursor: 'pointer', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>Mot de passe oublié ?</Link>
                        <Link onClick={() => onSwitch ? onSwitch() : navigate('/inscription')} sx={{ cursor: 'pointer', color: '#000', fontWeight: 700, fontSize: '0.85rem', opacity: 0.7, textDecoration: 'none' }}>Pas de compte ? Créer un profil</Link>
                    </Box>
                </Box>
            ) : (
                <Box>
                    <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: '#000' }}>
                        Entrez le code envoyé à <strong>{email}</strong>
                    </Typography>
                    <TextField 
                        fullWidth label="Code OTP" margin="normal" required value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Security sx={{ color: '#000' }} /></InputAdornment> }}
                        sx={fieldStyle}
                    />
                    <Button 
                        fullWidth variant="contained" onClick={handleVerifyOtp} disabled={loading}
                        sx={{ mt: 3, py: 2, bgcolor: '#3b82f6', fontWeight: '900' }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : "Vérifier le code"}
                    </Button>
                    <Button fullWidth variant="text" onClick={() => setIsMfaRequired(false)} sx={{ mt: 1, color: '#000', fontSize: '0.75rem' }}>Retour</Button>
                </Box>
            )}
        </Box>
    );
};

export default Connexion;