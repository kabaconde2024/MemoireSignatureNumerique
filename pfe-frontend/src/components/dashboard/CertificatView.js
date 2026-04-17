import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, Chip, Alert, Card, CardContent, Grid, LinearProgress, useMediaQuery } from '@mui/material';
import { CardMembership, Download, HourglassBottom, Refresh, CheckCircle, Pending, Error as ErrorIcon, Info } from '@mui/icons-material';
import axios from 'axios';

const CertificatView = ({ currentStatus, onStatusRefresh, setSnackbar, isMobile = false }) => {
    const [loading, setLoading] = useState(false);
    const [renewLoading, setRenewLoading] = useState(false);
    const [certInfo, setCertInfo] = useState(null);
    const [isExpired, setIsExpired] = useState(false);
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    useEffect(() => {
        const fetchCertificat = async () => {
            if (currentStatus === 'ACTIVE') {
                try {
                    const res = await axios.get('https://trustsign-backend-3zsj.onrender.com/api/utilisateur/pki/mon-statut', { withCredentials: true });
                    setCertInfo(res.data);
                    if (res.data.dateExpiration) {
                        const expirationDate = new Date(res.data.dateExpiration);
                        const now = new Date();
                        setIsExpired(expirationDate < now);
                    }
                } catch (err) {
                    console.error("Erreur certificat:", err);
                }
            } else {
                setCertInfo(null);
                setIsExpired(false);
            }
        };
        fetchCertificat();
    }, [currentStatus]);

    const handleRequest = async () => {
        setLoading(true);
        try {
            await axios.post('https://trustsign-backend-3zsj.onrender.com/api/utilisateur/pki/request-certificate', {}, { withCredentials: true });
            setSnackbar({ open: true, message: "✅ Votre demande de certificat a été transmise avec succès.", severity: 'success' });
            if (onStatusRefresh) onStatusRefresh();
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.erreur || "Une erreur est survenue";
            setSnackbar({ open: true, message: `❌ ${errorMsg}`, severity: 'error' });
        } finally { setLoading(false); }
    };

    const handleRenew = async () => {
        setRenewLoading(true);
        try {
            await axios.post('https://trustsign-backend-3zsj.onrender.com/api/utilisateur/pki/renouveler-certificat', {}, { withCredentials: true });
            setSnackbar({ open: true, message: "✅ Votre demande de renouvellement a été enregistrée.", severity: 'success' });
            if (onStatusRefresh) onStatusRefresh();
        } catch (error) {
            setSnackbar({ open: true, message: `❌ ${error.response?.data?.message || "Erreur lors du renouvellement"}`, severity: 'error' });
        } finally { setRenewLoading(false); }
    };

    const handleDownload = () => {
        if (certInfo?.certificatPem) {
            const file = new Blob([certInfo.certificatPem], { type: 'text/plain' });
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = "certificat_trustsign.pem";
            link.click();
            URL.revokeObjectURL(url);
            setSnackbar({ open: true, message: "📄 Téléchargement du certificat démarré", severity: 'info' });
        }
    };

    const formaterDate = (dateSource) => {
        if (!dateSource) return "Non définie";
        try {
            const date = new Date(dateSource);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            }
            return "Date invalide";
        } catch (e) { return "Non disponible"; }
    };

    const getDaysUntilExpiration = () => {
        if (!certInfo?.dateExpiration) return null;
        const expiration = new Date(certInfo.dateExpiration);
        const now = new Date();
        const diffTime = expiration - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysUntilExpiration = getDaysUntilExpiration();
    const isNearExpiration = daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0;
    const isActive = currentStatus === 'ACTIVE';
    const isPending = currentStatus === 'PENDING';
    const isNone = !currentStatus || currentStatus === 'NONE' || currentStatus === 'null' || currentStatus === '';
    const showExpired = (isActive && isExpired) || currentStatus === 'EXPIRED';

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%', px: { xs: 1, sm: 2 } }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                
                <Stack direction={mobile ? "column" : "row"} alignItems={mobile ? "center" : "flex-start"} spacing={2} mb={3} textAlign={mobile ? "center" : "left"}>
                    <Box sx={{ bgcolor: '#fef3c7', p: 1.5, borderRadius: '16px', display: 'inline-flex' }}>
                        <CardMembership sx={{ color: '#ffc107', fontSize: { xs: 28, sm: 32 } }} />
                    </Box>
                    <Box>
                        <Typography variant={mobile ? "h6" : "h5"} fontWeight="800" sx={{ color: '#1a237e' }}>
                            Certificat Numérique X.509
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Identité numérique certifiée - Conformité ISO 27005
                        </Typography>
                    </Box>
                </Stack>

                <Card sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc', borderRadius: '20px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 600 }}>
                            Statut du certificat
                        </Typography>
                        <Chip
                            icon={showExpired ? <ErrorIcon /> : isActive ? <CheckCircle /> : isPending ? <Pending /> : <Info />}
                            label={showExpired ? "EXPIRÉ" : isActive ? "ACTIF" : isPending ? "EN ATTENTE" : "NON GÉNÉRÉ"}
                            color={showExpired ? "error" : isActive ? "success" : isPending ? "warning" : "default"}
                            size={mobile ? "small" : "medium"}
                        />
                    </Box>

                    {isActive && !showExpired && (
                        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} icon={<CheckCircle />}>
                            <Typography variant="subtitle2" fontWeight="bold">Certificat actif</Typography>
                            <Typography variant="body2">Votre certificat numérique est valide et opérationnel.</Typography>
                        </Alert>
                    )}

                    {isPending && (
                        <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
                            <Typography variant="subtitle2" fontWeight="bold">Demande en cours de traitement</Typography>
                            <Typography variant="body2">Un administrateur va vérifier votre identité.</Typography>
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress sx={{ borderRadius: '10px', height: 6 }} />
                                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>⏳ Délai moyen : 24-48 heures</Typography>
                            </Box>
                        </Alert>
                    )}

                    {showExpired && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                            <Typography variant="subtitle2" fontWeight="bold">Certificat expiré</Typography>
                            <Typography variant="body2">Veuillez renouveler votre certificat.</Typography>
                        </Alert>
                    )}

                    {isNone && (
                        <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                            <Typography variant="subtitle2" fontWeight="bold">Aucun certificat généré</Typography>
                            <Typography variant="body2">Cliquez ci-dessous pour initier le processus.</Typography>
                        </Alert>
                    )}

                    {isActive && !showExpired && certInfo && (
                        <Box sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ bgcolor: '#ffffff', p: 2, borderRadius: '12px' }}>
                                        <Typography variant="caption" sx={{ color: '#64748b' }}>📅 Date d'émission</Typography>
                                        <Typography variant="body2" fontWeight="600">{formaterDate(certInfo.dateEmission)}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ bgcolor: '#ffffff', p: 2, borderRadius: '12px' }}>
                                        <Typography variant="caption" sx={{ color: '#64748b' }}>⏰ Date d'expiration</Typography>
                                        <Typography variant="body2" fontWeight="600" sx={{ color: isNearExpiration ? '#d32f2f' : '#1e293b' }}>
                                            {formaterDate(certInfo.dateExpiration)}
                                            {isNearExpiration && <Chip label={`Expire dans ${daysUntilExpiration}j`} size="small" color="warning" sx={{ ml: 1 }} />}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {showExpired && (
                        <Box textAlign="center" py={2}>
                            <Button variant="contained" onClick={handleRenew} disabled={renewLoading} startIcon={renewLoading ? <HourglassBottom /> : <Refresh />} fullWidth={mobile} sx={{ bgcolor: '#ffc107', color: '#0b1e39', fontWeight: 'bold' }}>
                                {renewLoading ? "Traitement..." : "🔄 Renouveler mon certificat"}
                            </Button>
                        </Box>
                    )}

                    {isNone && (
                        <Box textAlign="center" py={2}>
                            <Button variant="contained" onClick={handleRequest} disabled={loading} startIcon={loading ? <HourglassBottom /> : <CardMembership />} fullWidth={mobile} sx={{ bgcolor: '#ffc107', color: '#0b1e39', fontWeight: 'bold' }}>
                                {loading ? "Génération..." : "📜 Demander mon certificat"}
                            </Button>
                        </Box>
                    )}

                    {isActive && !showExpired && certInfo && (
                        <Button variant="outlined" startIcon={<Download />} onClick={handleDownload} fullWidth sx={{ borderColor: '#0b1e39', color: '#0b1e39', fontWeight: 'bold', py: 1.5 }}>
                            Télécharger mon certificat (.pem)
                        </Button>
                    )}
                </Card>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>🛡️ Infrastructure PKI sécurisée - Conformité eIDAS</Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default CertificatView;