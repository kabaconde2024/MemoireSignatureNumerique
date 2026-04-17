import React, { useEffect, useState, useCallback } from 'react';
import { 
    Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, 
    TableContainer, Paper, Button, Chip, Stack, CircularProgress, 
    IconButton, Tooltip, Alert, Card, CardContent, Grid, 
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, Snackbar,
    useMediaQuery
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

// URL de l'API backend
const API_BASE_URL = 'https://trustsign-backend-3zsj.onrender.com';

// Fonction pour les requêtes API avec cookie
const fetchAPI = async (endpoint, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
};

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
    
    // Responsive detection
    const isMobile = useMediaQuery('(max-width:600px)');
    const isTablet = useMediaQuery('(max-width:960px)');
    const isSmallMobile = useMediaQuery('(max-width:380px)');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [demandesData, actifsData, statsData] = await Promise.all([
                fetchAPI('/api/admin/pki/demandes-en-attente'),
                fetchAPI('/api/admin/pki/certificats-actifs'),
                fetchAPI('/api/admin/pki/stats')
            ]);
            setDemandes(demandesData);
            setCertificatsActifs(actifsData);
            setStats(statsData);
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
            const data = await fetchAPI(`/api/admin/pki/approve/${userId}`, { method: 'POST' });
            setMessage({ text: data.message || "Certificat généré avec succès !", type: 'success' });
            setOpenPreviewModal(false);
            fetchData();
        } catch (error) {
            const errorMsg = error.message || "Échec de l'opération cryptographique";
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
            const data = await fetchAPI('/api/admin/pki/nettoyer-certificats-expires');
            setSnackbar({ open: true, message: data.message, severity: 'success' });
            fetchData();
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur lors du nettoyage", severity: 'error' });
        }
    };

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
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Header */}
            <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} mb={isMobile ? 2 : 4} spacing={isMobile ? 2 : 0}>
                <Box>
                    <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" sx={{ color: '#1a237e', fontSize: isSmallMobile ? '1.25rem' : 'inherit' }}>
                        Autorité de Certification (CA) Dashboard
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                        Gestion du cycle de vie des identités numériques (SoftHSMv2 + X.509)
                    </Typography>
                </Box>
                <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 1 : 2}>
                    <Button 
                        variant="outlined" 
                        color="warning"
                        startIcon={<DeleteSweepIcon />} 
                        onClick={nettoyerCertificatsExpires}
                        fullWidth={isMobile}
                        size={isMobile ? "small" : "medium"}
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                    >
                        Nettoyer expirés
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<RefreshIcon />} 
                        onClick={fetchData}
                        sx={{ borderRadius: 2, bgcolor: '#1a237e' }}
                        fullWidth={isMobile}
                        size={isMobile ? "small" : "medium"}
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
            <Grid container spacing={isMobile ? 2 : 3} mb={isMobile ? 3 : 5}>
                <Grid item xs={12} sm={6}>
                    <Card sx={{ borderLeft: '6px solid #ffa000', boxShadow: 3 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: isMobile ? 1.5 : 2 }}>
                            <HourglassEmpty sx={{ fontSize: isMobile ? 30 : 40, color: '#ffa000', mr: 2 }} />
                            <Box>
                                <Typography color="textSecondary" variant="overline" sx={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>
                                    Demandes CSR en attente
                                </Typography>
                                <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">{stats.pending}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Card sx={{ borderLeft: '6px solid #2e7d32', boxShadow: 3 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: isMobile ? 1.5 : 2 }}>
                            <VerifiedUser sx={{ fontSize: isMobile ? 30 : 40, color: '#2e7d32', mr: 2 }} />
                            <Box>
                                <Typography color="textSecondary" variant="overline" sx={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>
                                    Certificats Actifs
                                </Typography>
                                <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">{stats.active}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* SECTION 1 : DEMANDES EN ATTENTE */}
            <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', mb: 2 }}>
                <SecurityIcon sx={{ mr: 1 }} /> File d'attente de signature (RA/CA)
            </Typography>
            
            {isMobile ? (
                // Version mobile - cartes
                <Stack spacing={2} sx={{ mb: 5 }}>
                    {loading ? <Box textAlign="center"><CircularProgress /></Box> :
                     demandes.length === 0 ? <Paper sx={{ p: 3, textAlign: 'center' }}>Aucune demande en attente</Paper> :
                     demandes.map((row) => (
                        <Card key={row.id} sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Stack spacing={1.5}>
                                    <Typography variant="body1" fontWeight="bold">{row.prenom} {row.nom}</Typography>
                                    <Typography variant="caption" color="textSecondary">{row.email}</Typography>
                                    <Typography variant="caption">Demande: {row.dateDemande ? new Date(row.dateDemande).toLocaleString() : 'N/A'}</Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="outlined" size="small" startIcon={<VisibilityIcon />} onClick={() => ouvrirVisualisationDemande(row)} fullWidth>Visualiser</Button>
                                        <Button variant="contained" color="success" size="small" startIcon={<CheckCircleOutline />} onClick={() => handleApprove(row.id)} fullWidth>Approuver</Button>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                     ))}
                </Stack>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 5, overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 600 }}>
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
                                            <Button variant="outlined" size="small" startIcon={<VisibilityIcon />} onClick={() => ouvrirVisualisationDemande(row)}>Visualiser</Button>
                                            <Button variant="contained" color="success" size="small" startIcon={<CheckCircleOutline />} onClick={() => handleApprove(row.id)}>Approuver</Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* MODALE DE VISUALISATION DE LA DEMANDE */}
            <Dialog open={openPreviewModal} onClose={() => setOpenPreviewModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { margin: isMobile ? 1 : 2, width: isMobile ? 'calc(100% - 32px)' : 'auto' } }}>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white', py: isMobile ? 1.5 : 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant={isMobile ? "subtitle1" : "h6"}>📋 Détails de la demande de certificat</Typography>
                        <IconButton onClick={() => setOpenPreviewModal(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: isMobile ? 2 : 3 }}>
                    {selectedDemande && (
                        <Stack spacing={isMobile ? 2 : 3}>
                            <Card variant="outlined" sx={{ p: isMobile ? 1.5 : 2 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom><PersonIcon sx={{ fontSize: 16, mr: 0.5 }} /> Informations personnelles</Typography>
                                <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
                                    <Grid item xs={6}><Typography variant="caption" color="textSecondary">Nom complet</Typography><Typography variant="body2" fontWeight="bold">{selectedDemande.prenom} {selectedDemande.nom}</Typography></Grid>
                                    <Grid item xs={6}><Typography variant="caption" color="textSecondary">Rôle</Typography><Chip label={selectedDemande.role} size="small" sx={{ mt: 0.5 }} /></Grid>
                                    <Grid item xs={12}><Typography variant="caption" color="textSecondary">Email</Typography><Typography variant="body2"><EmailIcon sx={{ fontSize: 14, mr: 0.5 }} /> {selectedDemande.email}</Typography></Grid>
                                    <Grid item xs={12}><Typography variant="caption" color="textSecondary">Téléphone</Typography><Typography variant="body2"><PhoneIcon sx={{ fontSize: 14, mr: 0.5 }} /> {selectedDemande.telephone || 'Non renseigné'}</Typography></Grid>
                                </Grid>
                            </Card>
                            <Card variant="outlined" sx={{ p: isMobile ? 1.5 : 2 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom><BadgeIcon sx={{ fontSize: 16, mr: 0.5 }} /> Informations de certification</Typography>
                                <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
                                    <Grid item xs={12}><Typography variant="caption" color="textSecondary">Alias HSM</Typography><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>{selectedDemande.hsmAlias || 'À générer'}</Typography></Grid>
                                    <Grid item xs={12}><Typography variant="caption" color="textSecondary">Statut actuel</Typography><Chip label={selectedDemande.statusPki === 'PENDING' ? 'Demande en attente' : selectedDemande.statusPki} color={selectedDemande.statusPki === 'PENDING' ? 'warning' : 'default'} size="small" /></Grid>
                                </Grid>
                            </Card>
                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                <Typography variant="body2">⚠️ En approuvant cette demande, vous allez :</Typography>
                                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                    <li>Générer une paire de clés RSA 2048 bits dans le HSM</li>
                                    <li>Créer un certificat X.509 signé par l'autorité de certification</li>
                                    <li>Lier le certificat à l'utilisateur {selectedDemande.prenom} {selectedDemande.nom}</li>
                                </ul>
                            </Alert>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: isMobile ? 2 : 2, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1 : 0 }}>
                    <Button variant="outlined" onClick={() => setOpenPreviewModal(false)} fullWidth={isMobile}>Refuser</Button>
                    <Button variant="contained" color="success" startIcon={<CheckCircleOutline />} onClick={() => handleApprove(selectedDemande?.id)} fullWidth={isMobile}>Approuver & Générer</Button>
                </DialogActions>
            </Dialog>

            {/* SECTION 2 : RÉPERTOIRE DES CERTIFICATS */}
            <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', mt: isMobile ? 3 : 0, mb: 2 }}>
                <DnsIcon sx={{ mr: 1 }} /> Répertoire des Certificats
            </Typography>
            
            {isMobile ? (
                <Stack spacing={2}>
                    {loading ? <Box textAlign="center"><CircularProgress /></Box> :
                     certificatsActifs.length === 0 ? <Paper sx={{ p: 3, textAlign: 'center' }}>Aucun certificat émis</Paper> :
                     certificatsActifs.map((cert) => {
                        const estExpire = isCertificatExpire(cert);
                        return (
                            <Card key={cert.id} sx={{ bgcolor: estExpire ? '#fff3cd' : 'inherit', borderRadius: 2 }}>
                                <CardContent>
                                    <Stack spacing={1.5}>
                                        <Typography variant="body1" fontWeight="bold">{cert.nomComplet}</Typography>
                                        <Typography variant="caption" color="textSecondary">{cert.email}</Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Chip label={estExpire ? "EXPIRÉ" : "ACTIF"} color={estExpire ? "error" : "success"} size="small" />
                                            <Typography variant="caption" color={estExpire ? "error" : "textSecondary"}>
                                                Expire: {cert.dateExpiration ? new Date(cert.dateExpiration).toLocaleDateString() : 'N/A'}
                                            </Typography>
                                        </Stack>
                                        <Button startIcon={<VisibilityIcon />} variant="outlined" size="small" onClick={() => ouvrirVisualisation(cert)} fullWidth>Visualiser X.509</Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        );
                     })}
                </Stack>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
                    <Table sx={{ minWidth: 700 }}>
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
                            {loading ? <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow> :
                             certificatsActifs.length === 0 ? <TableRow><TableCell colSpan={5} align="center">Aucun certificat émis</TableCell></TableRow> :
                             certificatsActifs.map((cert) => {
                                const estExpire = isCertificatExpire(cert);
                                return (
                                    <TableRow key={cert.id} hover sx={{ bgcolor: estExpire ? '#fff3cd' : 'inherit' }}>
                                        <TableCell>{cert.nomComplet}</TableCell>
                                        <TableCell>{cert.email}</TableCell>
                                        <TableCell><Chip label={estExpire ? "EXPIRÉ" : "ACTIF"} color={estExpire ? "error" : "success"} size="small" variant="outlined" /></TableCell>
                                        <TableCell><Typography variant="body2" color={estExpire ? "error" : "textSecondary"}>{cert.dateExpiration ? new Date(cert.dateExpiration).toLocaleDateString() : 'N/A'}</Typography></TableCell>
                                        <TableCell align="center"><Button startIcon={<VisibilityIcon />} variant="outlined" size="small" onClick={() => ouvrirVisualisation(cert)}>Visualiser X.509</Button></TableCell>
                                    </TableRow>
                                );
                             })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* MODALE DE VISUALISATION X.509 */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { margin: isMobile ? 1 : 2, width: isMobile ? 'calc(100% - 32px)' : 'auto' } }}>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: isMobile ? 1.5 : 2 }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"}>Certificat Numérique - {selectedCert?.nomComplet}</Typography>
                    <IconButton onClick={() => setOpenModal(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 1 }}>
                        <Grid item xs={6}><Typography variant="caption" color="textSecondary">Numéro de Série</Typography><Typography variant="body2" fontWeight="bold" sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>{selectedCert?.numeroSerie}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="textSecondary">Algorithme</Typography><Typography variant="body2" fontWeight="bold">{selectedCert?.algorithme}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="textSecondary">Valide du</Typography><Typography variant="body2">{selectedCert?.dateEmission ? new Date(selectedCert.dateEmission).toLocaleDateString() : 'N/A'}</Typography></Grid>
                        <Grid item xs={6}><Typography variant="caption" color="textSecondary">Expire le</Typography><Typography variant="body2" color="error">{selectedCert?.dateExpiration ? new Date(selectedCert.dateExpiration).toLocaleDateString() : 'N/A'}</Typography></Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="primary">Clé Publique (Base64)</Typography>
                    <Box sx={{ bgcolor: '#f0f0f0', p: 1, borderRadius: 1, fontSize: isMobile ? '0.6rem' : '0.7rem', wordBreak: 'break-all', fontFamily: 'monospace', maxHeight: isMobile ? 100 : 'auto', overflow: 'auto' }}>{selectedCert?.clePublique}</Box>
                    <Typography variant="caption" color="primary" sx={{ mt: 2, display: 'block' }}>Bloc PEM Complet</Typography>
                    <Box sx={{ bgcolor: '#1e1e1e', color: '#4caf50', p: isMobile ? 1.5 : 2, mt: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: isMobile ? '0.6rem' : '0.75rem', maxHeight: isMobile ? 200 : 300, overflow: 'auto' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{selectedCert?.certificatPem}</pre>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: isMobile ? 2 : 2 }}>
                    <Button startIcon={<CopyIcon />} onClick={copierPem} size={isMobile ? "small" : "medium"}>Copier PEM</Button>
                    <Button onClick={() => setOpenModal(false)} variant="contained" size={isMobile ? "small" : "medium"}>Fermer</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'left' }}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default AdminCertificats;