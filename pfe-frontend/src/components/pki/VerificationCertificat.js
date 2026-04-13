import React, { useState } from 'react';
import { 
    Box, Card, CardContent, Typography, Button, Alert, 
    CircularProgress, Chip, Grid, Divider, Stack, useMediaQuery
} from '@mui/material';
import { 
    VerifiedUser, Security, CheckCircle, Error as ErrorIcon,
    Refresh, Warning, Info
} from '@mui/icons-material';
import API from '../services/api';

const VerificationCertificat = () => {
    const [loading, setLoading] = useState(false);
    const [resultat, setResultat] = useState(null);
    const [statutGlobal, setStatutGlobal] = useState(null);
    
    // Responsive detection
    const isMobile = useMediaQuery('(max-width:600px)');
    const isSmallMobile = useMediaQuery('(max-width:380px)');

    const verifierCertificat = async () => {
        setLoading(true);
        setResultat(null);
        try {
            const response = await API.get('/pki/verifier-mon-certificat');
            setResultat(response.data);
            setStatutGlobal(response.data.valide ? 'succes' : 'erreur');
        } catch (error) {
            console.error("Erreur vérification:", error);
            setStatutGlobal('erreur');
            setResultat({ 
                valide: false, 
                resume: error.response?.data?.erreur || "Erreur lors de la vérification" 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card sx={{ 
            mb: { xs: 2, sm: 3 }, 
            borderRadius: 2, 
            border: '1px solid #e0e0e0',
            mx: { xs: 1, sm: 0 }
        }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} spacing={isMobile ? 2 : 0}>
                    <Box display="flex" alignItems="center">
                        <Security sx={{ color: '#1a237e', mr: 1, fontSize: isMobile ? 24 : 28 }} />
                        <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" sx={{ fontSize: isSmallMobile ? '0.9rem' : 'inherit' }}>
                            Vérification du Certificat Numérique
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={isMobile ? 16 : 20} /> : <Refresh />}
                        onClick={verifierCertificat}
                        disabled={loading}
                        sx={{ bgcolor: '#1a237e', py: isMobile ? 0.75 : 1, fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                        fullWidth={isMobile}
                    >
                        {loading ? "Vérification..." : "Vérifier mon certificat"}
                    </Button>
                </Stack>

                {resultat && (
                    <Box sx={{ mt: { xs: 2, sm: 3 } }}>
                        <Alert 
                            severity={resultat.valide ? "success" : "error"}
                            icon={resultat.valide ? <VerifiedUser /> : <ErrorIcon />}
                            sx={{ mb: 2, borderRadius: 2, fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                        >
                            <Typography variant={isMobile ? "body2" : "subtitle2"} fontWeight="bold">
                                {resultat.resume}
                            </Typography>
                        </Alert>

                        {resultat.infos && resultat.infos.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant={isMobile ? "body2" : "subtitle2"} color="success.main" gutterBottom>
                                    ✅ Informations validées :
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: isMobile ? 16 : 20 }}>
                                    {resultat.infos.map((info, idx) => (
                                        <li key={idx}><Typography variant="body2" sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>{info}</Typography></li>
                                    ))}
                                </ul>
                            </Box>
                        )}

                        {resultat.warnings && resultat.warnings.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant={isMobile ? "body2" : "subtitle2"} color="warning.main" gutterBottom>
                                    ⚠️ Avertissements :
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: isMobile ? 16 : 20 }}>
                                    {resultat.warnings.map((warning, idx) => (
                                        <li key={idx}><Typography variant="body2" sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>{warning}</Typography></li>
                                    ))}
                                </ul>
                            </Box>
                        )}

                        {resultat.erreurs && resultat.erreurs.length > 0 && !resultat.valide && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant={isMobile ? "body2" : "subtitle2"} color="error.main" gutterBottom>
                                    ❌ Erreurs détectées :
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: isMobile ? 16 : 20 }}>
                                    {resultat.erreurs.map((erreur, idx) => (
                                        <li key={idx}><Typography variant="body2" sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>{erreur}</Typography></li>
                                    ))}
                                </ul>
                            </Box>
                        )}

                        <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />

                        <Grid container spacing={isMobile ? 1 : 2}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>Statut global</Typography>
                                <Chip 
                                    label={resultat.valide ? "CERTIFICAT VALIDE" : "CERTIFICAT INVALIDE"}
                                    color={resultat.valide ? "success" : "error"}
                                    size="small"
                                    sx={{ mt: 0.5, fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>Dernière vérification</Typography>
                                <Typography variant="body2" sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>{new Date().toLocaleString()}</Typography>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default VerificationCertificat;