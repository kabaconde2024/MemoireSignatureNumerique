// src/components/pki/VerificationCertificat.jsx
import React, { useState } from 'react';
import { 
    Box, Card, CardContent, Typography, Button, Alert, 
    CircularProgress, Chip, Grid, Divider, Stack 
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
        <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                        <Security sx={{ color: '#1a237e', mr: 1 }} />
                        <Typography variant="h6" fontWeight="bold">
                            Vérification du Certificat Numérique
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                        onClick={verifierCertificat}
                        disabled={loading}
                        sx={{ bgcolor: '#1a237e' }}
                    >
                        {loading ? "Vérification..." : "Vérifier mon certificat"}
                    </Button>
                </Stack>

                {resultat && (
                    <Box sx={{ mt: 3 }}>
                        <Alert 
                            severity={resultat.valide ? "success" : "error"}
                            icon={resultat.valide ? <VerifiedUser /> : <ErrorIcon />}
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="subtitle2" fontWeight="bold">
                                {resultat.resume}
                            </Typography>
                        </Alert>

                        {resultat.infos && resultat.infos.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="success.main" gutterBottom>
                                    ✅ Informations validées :
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {resultat.infos.map((info, idx) => (
                                        <li key={idx}><Typography variant="body2">{info}</Typography></li>
                                    ))}
                                </ul>
                            </Box>
                        )}

                        {resultat.warnings && resultat.warnings.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                    ⚠️ Avertissements :
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {resultat.warnings.map((warning, idx) => (
                                        <li key={idx}><Typography variant="body2">{warning}</Typography></li>
                                    ))}
                                </ul>
                            </Box>
                        )}

                        {resultat.erreurs && resultat.erreurs.length > 0 && !resultat.valide && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="error.main" gutterBottom>
                                    ❌ Erreurs détectées :
                                </Typography>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {resultat.erreurs.map((erreur, idx) => (
                                        <li key={idx}><Typography variant="body2">{erreur}</Typography></li>
                                    ))}
                                </ul>
                            </Box>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Statut global</Typography>
                                <Chip 
                                    label={resultat.valide ? "CERTIFICAT VALIDE" : "CERTIFICAT INVALIDE"}
                                    color={resultat.valide ? "success" : "error"}
                                    size="small"
                                    sx={{ mt: 0.5 }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Dernière vérification</Typography>
                                <Typography variant="body2">{new Date().toLocaleString()}</Typography>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default VerificationCertificat;