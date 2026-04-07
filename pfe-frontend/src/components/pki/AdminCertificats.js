import React, { useEffect, useState, useCallback } from 'react';
import { 
    Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, 
    TableContainer, Paper, Button, Chip, Stack, CircularProgress, 
    IconButton, Tooltip, Alert, Card, CardContent, Grid, 
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, Snackbar
} from '@mui/material';
import { 
    VerifiedUser, 
    HourglassEmpty, 
    Refresh as RefreshIcon,
    CheckCircleOutline,
    Block as BlockIcon,
    Security as SecurityIcon,
    Dns as DnsIcon,
    Visibility as VisibilityIcon,
    Close as CloseIcon,
    ContentCopy as CopyIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Badge as BadgeIcon,
    DeleteSweep as DeleteSweepIcon
} from '@mui/icons-material';
import API from '../../services/api';

const AdminCertificats = () => {
    const [demandes, setDemandes] = useState([]);
    const [certificatsActifs, setCertificatsActifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ pending: 0, active: 0 });
    const [message, setMessage] = useState({ text: '', type: 'info' });
    const [openModal, setOpenModal] = useState(false);
    const [selectedCert, setSelectedCert] = useState(null);
    const [openPreviewModal, setOpenPreviewModal] = useState(false);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resDemandes, resActifs, resStats] = await Promise.all([
                API.get('/admin/pki/demandes-en-attente'),
                API.get('/admin/pki/certificats-actifs'),
                API.get('/admin/pki/stats')
            ]);
            setDemandes(resDemandes.data);
            setCertificatsActifs(resActifs.data);
            setStats(resStats.data);
        } catch (error) {
            console.error("Erreur PKI:", error);
            setMessage({ text: "Erreur lors du chargement des services PKI", type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const ouvrirVisualisationDemande = (demande) => {
        setSelectedDemande(demande);
        setOpenPreviewModal(true);
    };

    const handleApprove = async (userId) => {
        try {
            setMessage({ text: "Initialisation du SoftHSM et signature cryptographique...", type: 'info' });
            const response = await API.post(`/admin/pki/approve/${userId}`);
            setMessage({ text: response.data.message || "Certificat généré avec succès !", type: 'success' });
            setOpenPreviewModal(false);
            fetchData();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Échec de l'opération cryptographique";
            setMessage({ text: errorMsg, type: 'error' });
        }
    };

    const ouvrirVisualisation = (cert) => {
        setSelectedCert(cert);
        setOpenModal(true);
    };

    const copierPem = () => {
        if (selectedCert?.certificatPem) {
            navigator.clipboard.writeText(selectedCert.certificatPem);
            setSnackbar({ open: true, message: "PEM copié dans le presse-papier", severity: 'success' });
        }
    };

    const nettoyerCertificatsExpires = async () => {
        try {
            const response = await API.get('/admin/pki/nettoyer-certificats-expires');
            setSnackbar({ open: true, message: response.data.message, severity: 'success' });
            fetchData();
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur lors du nettoyage", severity: 'error' });
        }
    };

    // Vérifier si un certificat est expiré
    const isCertificatExpire = (cert) => {
        if (!cert.dateExpiration) return false;
        try {
            const expirationDate = new Date(cert.dateExpiration);
            const now = new Date();
            return expirationDate < now;
        } catch (e) {
            return false;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1a237e' }}>
                        Autorité de Certification (CA) Dashboard
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Gestion du cycle de vie des identités numériques (SoftHSMv2 + X.509)
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button 
                        variant="outlined" 
                        color="warning"
                        startIcon={<DeleteSweepIcon />} 
                        onClick={nettoyerCertificatsExpires}
                    >
                        Nettoyer expirés
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<RefreshIcon />} 
                        onClick={fetchData}
                        sx={{ borderRadius: 2, bgcolor: '#1a237e' }}
                    >
                        Actualiser
                    </Button>
                </Stack>
            </Stack>

            {message.text && (
                <Alert severity={message.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setMessage({ text: '', type: 'info' })}>
                    {message.text}
                </Alert>
            )}

            {/* Statistiques */}
            <Grid container spacing={3} mb={5}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderLeft: '6px solid #ffa000', boxShadow: 3 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                            <HourglassEmpty sx={{ fontSize: 40, color: '#ffa000', mr: 2 }} />
                            <Box>
                                <Typography color="textSecondary" variant="overline">Demandes CSR en attente</Typography>
                                <Typography variant="h4" fontWeight="bold">{stats.pending}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderLeft: '6px solid #2e7d32', boxShadow: 3 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                            <VerifiedUser sx={{ fontSize: 40, color: '#2e7d32', mr: 2 }} />
                            <Box>
                                <Typography color="textSecondary" variant="overline">Certificats Actifs</Typography>
                                <Typography variant="h4" fontWeight="bold">{stats.active}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* SECTION 1 : DEMANDES EN ATTENTE */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                <SecurityIcon sx={{ mr: 1 }} /> File d'attente de signature (RA/CA)
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 5 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><b>Utilisateur</b></TableCell>
                            <TableCell><b>Email</b></TableCell>
                            <TableCell><b>Date demande</b></TableCell>
                            <TableCell align="center"><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow> :
                         demandes.length === 0 ? <TableRow><TableCell colSpan={4} align="center">Aucune demande en attente</TableCell></TableRow> :
                         demandes.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>{row.prenom} {row.nom}</TableCell>
                                <TableCell>{row.email}</TableCell>
                                <TableCell>{row.dateDemande ? new Date(row.dateDemande).toLocaleString() : 'N/A'}</TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={1} justifyContent="center">
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => ouvrirVisualisationDemande(row)}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Visualiser
                                        </Button>
                                        <Button 
                                            variant="contained" 
                                            color="success" 
                                            size="small"
                                            startIcon={<CheckCircleOutline />}
                                            onClick={() => handleApprove(row.id)}
                                        >
                                            Approuver & Signer
                                        </Button>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODALE DE VISUALISATION DE LA DEMANDE AVANT APPROBATION */}
            <Dialog open={openPreviewModal} onClose={() => setOpenPreviewModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">📋 Détails de la demande de certificat</Typography>
                        <IconButton onClick={() => setOpenPreviewModal(false)} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedDemande && (
                        <Stack spacing={3}>
                            <Card variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                    <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} /> Informations personnelles
                                </Typography>
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">Nom complet</Typography>
                                        <Typography variant="body2" fontWeight="bold">{selectedDemande.prenom} {selectedDemande.nom}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">Rôle</Typography>
                                        <Chip label={selectedDemande.role} size="small" sx={{ mt: 0.5 }} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary">Email</Typography>
                                        <Typography variant="body2"><EmailIcon sx={{ fontSize: 14, mr: 0.5 }} /> {selectedDemande.email}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary">Téléphone</Typography>
                                        <Typography variant="body2"><PhoneIcon sx={{ fontSize: 14, mr: 0.5 }} /> {selectedDemande.telephone || 'Non renseigné'}</Typography>
                                    </Grid>
                                </Grid>
                            </Card>

                            <Card variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                    <BadgeIcon sx={{ fontSize: 16, mr: 0.5 }} /> Informations de certification
                                </Typography>
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary">Alias HSM</Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                            {selectedDemande.hsmAlias || 'À générer'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary">Statut actuel</Typography>
                                        <Chip 
                                            label={selectedDemande.statusPki === 'PENDING' ? 'Demande en attente' : selectedDemande.statusPki}
                                            color={selectedDemande.statusPki === 'PENDING' ? 'warning' : 'default'}
                                            size="small"
                                            sx={{ mt: 0.5 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="textSecondary">Date de la demande</Typography>
                                        <Typography variant="body2">{selectedDemande.dateDemande ? new Date(selectedDemande.dateDemande).toLocaleString() : 'N/A'}</Typography>
                                    </Grid>
                                </Grid>
                            </Card>

                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                <Typography variant="body2">
                                    ⚠️ En approuvant cette demande, vous allez :
                                </Typography>
                                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                    <li>Générer une paire de clés RSA 2048 bits dans le HSM</li>
                                    <li>Créer un certificat X.509 signé par l'autorité de certification</li>
                                    <li>Lier le certificat à l'utilisateur {selectedDemande.prenom} {selectedDemande.nom}</li>
                                </ul>
                            </Alert>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Button variant="outlined" onClick={() => setOpenPreviewModal(false)}>
                        Refuser
                    </Button>
                    <Button 
                        variant="contained" 
                        color="success"
                        startIcon={<CheckCircleOutline />}
                        onClick={() => handleApprove(selectedDemande?.id)}
                    >
                        Approuver & Générer le certificat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* SECTION 2 : RÉPERTOIRE DES CERTIFICATS */}
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                <DnsIcon sx={{ mr: 1 }} /> Répertoire des Certificats
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><b>Détenteur</b></TableCell>
                            <TableCell><b>Email</b></TableCell>
                            <TableCell><b>Statut</b></TableCell>
                            <TableCell><b>Date expiration</b></TableCell>
                            <TableCell align="center"><b>Audit Certificat</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : certificatsActifs.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center">Aucun certificat émis</TableCell></TableRow>
                        ) : (
                            certificatsActifs.map((cert) => {
                                const estExpire = isCertificatExpire(cert);
                                return (
                                    <TableRow key={cert.id} hover sx={{ bgcolor: estExpire ? '#fff3cd' : 'inherit' }}>
                                        <TableCell>{cert.nomComplet}</TableCell>
                                        <TableCell>{cert.email}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={estExpire ? "EXPIRÉ" : "ACTIF"} 
                                                color={estExpire ? "error" : "success"} 
                                                size="small" 
                                                variant="outlined" 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color={estExpire ? "error" : "textSecondary"}>
                                                {cert.dateExpiration ? new Date(cert.dateExpiration).toLocaleDateString() : 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button 
                                                startIcon={<VisibilityIcon />} 
                                                variant="outlined" 
                                                size="small"
                                                onClick={() => ouvrirVisualisation(cert)}
                                            >
                                                Visualiser X.509
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODALE DE VISUALISATION X.509 */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Certificat Numérique - {selectedCert?.nomComplet}
                    <IconButton onClick={() => setOpenModal(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Numéro de Série</Typography>
                            <Typography variant="body2" fontWeight="bold">{selectedCert?.numeroSerie}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Algorithme</Typography>
                            <Typography variant="body2" fontWeight="bold">{selectedCert?.algorithme}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Valide du</Typography>
                            <Typography variant="body2">{selectedCert?.dateEmission ? new Date(selectedCert.dateEmission).toLocaleDateString() : 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Expire le</Typography>
                            <Typography variant="body2" color="error">{selectedCert?.dateExpiration ? new Date(selectedCert.dateExpiration).toLocaleDateString() : 'N/A'}</Typography>
                        </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="caption" color="primary">Clé Publique (Base64)</Typography>
                    <Box sx={{ bgcolor: '#f0f0f0', p: 1, borderRadius: 1, fontSize: '0.7rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {selectedCert?.clePublique}
                    </Box>
                    
                    <Typography variant="caption" color="primary" sx={{ mt: 2, display: 'block' }}>Bloc PEM Complet</Typography>
                    <Box sx={{ bgcolor: '#1e1e1e', color: '#4caf50', p: 2, mt: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        <pre style={{ margin: 0 }}>{selectedCert?.certificatPem}</pre>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button startIcon={<CopyIcon />} onClick={copierPem}>Copier PEM</Button>
                    <Button onClick={() => setOpenModal(false)} variant="contained">Fermer</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar pour les notifications */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={4000} 
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AdminCertificats;