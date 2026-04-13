import React, { useState } from 'react';
import { 
    Box, TextField, Button, Alert, InputAdornment, 
    CircularProgress, Typography, Link, Divider, useMediaQuery
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

    // Responsive detection
    const isMobile = useMediaQuery('(max-width:600px)');
    const isSmallMobile = useMediaQuery('(max-width:380px)');

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
        <Box sx={{ 
            p: { xs: 2.5, sm: 3, md: 4 }, 
            bgcolor: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(15px)', 
            borderRadius: { xs: 4, sm: 6 },
            maxWidth: { xs: '100%', sm: 500, md: 550 },
            mx: 'auto',
            width: '100%'
        }}>
            <Box sx={{ mb: { xs: 2, sm: 3, md: 4 }, textAlign: 'center' }}>
                <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    fontWeight="900" 
                    sx={{ 
                        color: '#000', 
                        mb: 1,
                        fontSize: isSmallMobile ? '1.25rem' : 'inherit'
                    }}
                >
                    {isMfaRequired ? "SÉCURITÉ" : "CONNEXION"}
                </Typography>
                <Box sx={{ 
                    width: { xs: 40, sm: 60 }, 
                    height: 4, 
                    bgcolor: '#3b82f6', 
                    mx: 'auto', 
                    borderRadius: 2 
                }} />
            </Box>

            {error && (
                <Alert 
                    severity="error" 
                    sx={{ 
                        mb: { xs: 2, sm: 3 }, 
                        borderRadius: '12px',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                >
                    {error}
                </Alert>
            )}

            {!isMfaRequired ? (
                <Box>
                    <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', justifyContent: 'center' }}>
                        <GoogleLoginNative onSuccess={handleGoogleSuccess} />
                    </Box>
                    <Divider sx={{ mb: { xs: 2, sm: 3 } }}>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: '#000', 
                                fontWeight: 600, 
                                px: 1,
                                fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }}
                        >
                            OU AVEC EMAIL
                        </Typography>
                    </Divider>
                    <TextField 
                        fullWidth 
                        label="Email" 
                        margin="normal" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start"><Email sx={{ color: '#000', fontSize: isMobile ? 20 : 24 }} /></InputAdornment> 
                        }}
                        sx={fieldStyle}
                        size={isMobile ? "small" : "medium"}
                    />
                    <TextField 
                        fullWidth 
                        label="Mot de passe" 
                        type="password" 
                        margin="normal" 
                        required 
                        value={motDePasse}
                        onChange={(e) => setMotDePasse(e.target.value)}
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#000', fontSize: isMobile ? 20 : 24 }} /></InputAdornment> 
                        }}
                        sx={fieldStyle}
                        size={isMobile ? "small" : "medium"}
                    />
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={handleLogin} 
                        disabled={loading}
                        sx={{ 
                            mt: { xs: 2, sm: 3 }, 
                            py: { xs: 1.5, sm: 2 }, 
                            bgcolor: '#1c1212', 
                            fontWeight: '900', 
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            "&:hover": { bgcolor: '#333' } 
                        }}
                    >
                        {loading ? <CircularProgress size={isMobile ? 20 : 24} color="inherit" /> : "Se connecter"}
                    </Button>
                    <Box sx={{ 
                        mt: { xs: 2, sm: 3 }, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: { xs: 0.5, sm: 1 }, 
                        alignItems: 'center' 
                    }}>
                        <Link 
                            onClick={() => navigate('/mot-de-passe-oublie')} 
                            sx={{ 
                                cursor: 'pointer', 
                                color: '#3b82f6', 
                                fontWeight: 700, 
                                fontSize: { xs: '0.7rem', sm: '0.85rem' }, 
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' }
                            }}
                        >
                            Mot de passe oublié ?
                        </Link>
                        <Link 
                            onClick={() => onSwitch ? onSwitch() : navigate('/inscription')} 
                            sx={{ 
                                cursor: 'pointer', 
                                color: '#000', 
                                fontWeight: 700, 
                                fontSize: { xs: '0.7rem', sm: '0.85rem' }, 
                                opacity: 0.7, 
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline', opacity: 1 }
                            }}
                        >
                            Pas de compte ? Créer un profil
                        </Link>
                    </Box>
                </Box>
            ) : (
                <Box>
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            mb: { xs: 2, sm: 3 }, 
                            textAlign: 'center', 
                            color: '#000',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            wordBreak: 'break-word'
                        }}
                    >
                        Entrez le code envoyé à <strong>{email}</strong>
                    </Typography>
                    <TextField 
                        fullWidth 
                        label="Code OTP" 
                        margin="normal" 
                        required 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start"><Security sx={{ color: '#000', fontSize: isMobile ? 20 : 24 }} /></InputAdornment>,
                            inputProps: { 
                                maxLength: 6,
                                style: { 
                                    textAlign: 'center', 
                                    letterSpacing: isMobile ? '2px' : '4px', 
                                    fontSize: isMobile ? '1.1rem' : '1.25rem',
                                    fontWeight: 600
                                }
                            }
                        }}
                        sx={fieldStyle}
                        size={isMobile ? "small" : "medium"}
                    />
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={handleVerifyOtp} 
                        disabled={loading}
                        sx={{ 
                            mt: { xs: 2, sm: 3 }, 
                            py: { xs: 1.5, sm: 2 }, 
                            bgcolor: '#3b82f6', 
                            fontWeight: '900',
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                    >
                        {loading ? <CircularProgress size={isMobile ? 20 : 24} color="inherit" /> : "Vérifier le code"}
                    </Button>
                    <Button 
                        fullWidth 
                        variant="text" 
                        onClick={() => setIsMfaRequired(false)} 
                        sx={{ 
                            mt: 1, 
                            color: '#000', 
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' }
                        }}
                    >
                        Retour
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default Connexion;