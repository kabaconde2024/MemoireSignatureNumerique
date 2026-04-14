import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, Card, CardContent, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Alert, Stack, Tooltip, Divider,
    Tabs, Tab, useMediaQuery
} from '@mui/material';
import {
    Archive as ArchiveIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Verified as VerifiedIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import axios from 'axios';

const ArchivesView = ({ setSnackbar, isMobile = false, isTablet = false }) => {
    const [archives, setArchives] = useState([]);
    const [nonArchivedDocs, setNonArchivedDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingNonArchived, setLoadingNonArchived] = useState(false);
    const [selectedArchive, setSelectedArchive] = useState(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [openArchiveDialog, setOpenArchiveDialog] = useState(false);
    const [selectedDocToArchive, setSelectedDocToArchive] = useState(null);
    const [archiveLevel, setArchiveLevel] = useState('LEGAL');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [stats, setStats] = useState({ total: 0, actives: 0, expirees: 0, tailleTotale: 0 });
    
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    const fetchArchives = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/archivage/liste', { withCredentials: true });
            setArchives(response.data);
            calculerStats(response.data);
        } catch (error) {
            console.error("Erreur chargement archives:", error);
            if (setSnackbar) setSnackbar({ open: true, message: "Erreur lors du chargement des archives", severity: 'error' });
        } finally { setLoading(false); }
    };

    const fetchNonArchivedDocuments = async () => {
        setLoadingNonArchived(true);
        try {
            const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/archivage/documents-non-archives', { withCredentials: true });
            setNonArchivedDocs(response.data);
        } catch (error) {
            console.error("Erreur chargement documents non archivés:", error);
            if (setSnackbar) setSnackbar({ open: true, message: "Erreur lors du chargement des documents non archivés", severity: 'error' });
        } finally { setLoadingNonArchived(false); }
    };

    const calculerStats = (data) => {
        const actives = data.filter(a => a.statut === 'ACTIF').length;
        const expirees = data.filter(a => new Date(a.dateExpiration) < new Date()).length;
        const tailleTotale = data.reduce((sum, a) => sum + parseFloat(a.tailleArchive || 0), 0);
        setStats({ total: data.length, actives, expirees, tailleTotale: tailleTotale.toFixed(2) });
    };

    const archiverDocumentManuel = async () => {
        if (!selectedDocToArchive) return;
        setLoading(true);
        try {
            await axios.post(`https://memoiresignaturenumerique.onrender.com/api/archivage/archiver/${selectedDocToArchive.id}?niveau=${archiveLevel}`, {}, { withCredentials: true });
            if (setSnackbar) setSnackbar({ open: true, message: `Document "${selectedDocToArchive.nom}" archivé avec succès`, severity: 'success' });
            setOpenArchiveDialog(false);
            setSelectedDocToArchive(null);
            fetchArchives();
            fetchNonArchivedDocuments();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Erreur lors de l'archivage";
            if (setSnackbar) setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        } finally { setLoading(false); }
    };

    const verifierIntegrite = async (documentId) => {
        try {
            const response = await axios.get(`https://memoiresignaturenumerique.onrender.com/api/archivage/verifier/${documentId}`, { withCredentials: true });
            if (setSnackbar) setSnackbar({ open: true, message: response.data.integre ? "Archive intègre ✅" : "Archive corrompue ❌", severity: response.data.integre ? 'success' : 'error' });
        } catch (error) {
            if (setSnackbar) setSnackbar({ open: true, message: "Erreur lors de la vérification", severity: 'error' });
        }
    };

    const exporterArchive = async (documentId, reference) => {
        try {
            const response = await axios.get(`https://memoiresignaturenumerique.onrender.com/api/archivage/exporter/${documentId}`, { withCredentials: true, responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `archive_${reference}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            if (setSnackbar) setSnackbar({ open: true, message: "Archive exportée avec succès", severity: 'success' });
        } catch (error) {
            if (setSnackbar) setSnackbar({ open: true, message: "Erreur lors de l'export", severity: 'error' });
        }
    };

    const supprimerArchive = async (archiveId) => {
        if (!window.confirm("Confirmer la suppression de cette archive ?")) return;
        try {
            await axios.delete(`https://memoiresignaturenumerique.onrender.com/api/archivage/${archiveId}`, { withCredentials: true });
            if (setSnackbar) setSnackbar({ open: true, message: "Archive supprimée avec succès", severity: 'success' });
            fetchArchives();
        } catch (error) {
            if (setSnackbar) setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: 'error' });
        }
    };

    const purgerArchivesExpirees = async () => {
        if (!window.confirm("⚠️ Cette action supprimera définitivement toutes les archives expirées. Continuer ?")) return;
        try {
            const response = await axios.delete('https://memoiresignaturenumerique.onrender.com/api/archivage/purger', { withCredentials: true });
            if (setSnackbar) setSnackbar({ open: true, message: `${response.data.archivesPurgees} archive(s) purgée(s) avec succès`, severity: 'success' });
            fetchArchives();
        } catch (error) {
            if (setSnackbar) setSnackbar({ open: true, message: "Erreur lors de la purge", severity: 'error' });
        }
    };

    useEffect(() => {
        fetchArchives();
        fetchNonArchivedDocuments();
    }, []);

    // ✅ CORRECTION : Définir filteredArchives et filteredNonArchived
    const filteredArchives = archives.filter(archive => 
        archive.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        archive.documentNom?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredNonArchived = nonArchivedDocs.filter(doc =>
        doc.nom?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ px: { xs: 0, sm: 1 } }}>
            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant={mobile ? "fullWidth" : "standard"}>
                    <Tab label={mobile ? "Archives" : "Archives existantes"} icon={<ArchiveIcon />} iconPosition="start" />
                    <Tab label={mobile ? "À archiver" : "Documents à archiver"} icon={<DescriptionIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {activeTab === 0 && (
                <Box>
                    <Grid container spacing={mobile ? 2 : 3} sx={{ mb: 4 }}>
                        <Grid item xs={6} sm={6} md={3}>
                            <Card><CardContent><Typography variant={mobile ? "h5" : "h4"} fontWeight="bold">{stats.total}</Typography><Typography variant="body2" color="textSecondary">Total archives</Typography></CardContent></Card>
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                            <Card sx={{ bgcolor: '#e8f5e9' }}><CardContent><Typography variant={mobile ? "h5" : "h4"} fontWeight="bold" color="success.main">{stats.actives}</Typography><Typography variant="body2" color="textSecondary">Archives actives</Typography></CardContent></Card>
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                            <Card sx={{ bgcolor: '#fff3e0' }}><CardContent><Typography variant={mobile ? "h5" : "h4"} fontWeight="bold" color="warning.main">{stats.expirees}</Typography><Typography variant="body2" color="textSecondary">Archives expirées</Typography></CardContent></Card>
                        </Grid>
                        <Grid item xs={6} sm={6} md={3}>
                            <Card><CardContent><Typography variant={mobile ? "h5" : "h4"} fontWeight="bold">{stats.tailleTotale} Mo</Typography><Typography variant="body2" color="textSecondary">Taille totale</Typography></CardContent></Card>
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: mobile ? 1.5 : 2, mb: 3, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextField size="small" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ width: mobile ? '100%' : 300 }} />
                        <Stack direction="row" spacing={2} sx={{ width: mobile ? '100%' : 'auto' }}>
                            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchArchives} disabled={loading} fullWidth={mobile}>Actualiser</Button>
                            <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={purgerArchivesExpirees} fullWidth={mobile}>Purger</Button>
                        </Stack>
                    </Paper>

                    {mobile ? (
                        <Stack spacing={2}>
                            {loading ? <Box textAlign="center"><CircularProgress /></Box> : filteredArchives.length === 0 ? <Typography textAlign="center">Aucune archive trouvée</Typography> : filteredArchives.map((archive) => (
                                <Paper key={archive.id} sx={{ p: 2 }}>
                                    <Stack spacing={1}>
                                        <Typography variant="body2" fontWeight="bold">{archive.reference}</Typography>
                                        <Typography variant="caption" color="textSecondary">{archive.documentNom || '-'}</Typography>
                                        <Typography variant="caption">Archivé: {new Date(archive.dateArchivage).toLocaleDateString()}</Typography>
                                        <Chip label={archive.statut} size="small" color={archive.statut === 'ACTIF' ? 'success' : 'error'} />
                                        <Stack direction="row" spacing={1}>
                                            <IconButton size="small" onClick={() => verifierIntegrite(archive.documentId)}><VerifiedIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" onClick={() => exporterArchive(archive.documentId, archive.reference)}><DownloadIcon fontSize="small" /></IconButton>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableCell>Référence</TableCell>
                                        <TableCell>Document</TableCell>
                                        <TableCell>Date archivage</TableCell>
                                        <TableCell>Expiration</TableCell>
                                        <TableCell>Niveau</TableCell>
                                        <TableCell>Statut</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow> : 
                                     filteredArchives.length === 0 ? <TableRow><TableCell colSpan={7} align="center">Aucune archive trouvée</TableCell></TableRow> : 
                                     filteredArchives.map((archive) => (
                                        <TableRow key={archive.id}>
                                            <TableCell>{archive.reference}</TableCell>
                                            <TableCell>{archive.documentNom || '-'}</TableCell>
                                            <TableCell>{new Date(archive.dateArchivage).toLocaleDateString()}</TableCell>
                                            <TableCell>{new Date(archive.dateExpiration).toLocaleDateString()}</TableCell>
                                            <TableCell><Chip label={archive.niveau} size="small" color={archive.niveau === 'LEGAL' ? 'primary' : 'default'} /></TableCell>
                                            <TableCell><Chip label={archive.statut} size="small" color={archive.statut === 'ACTIF' ? 'success' : 'error'} /></TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={1} justifyContent="center">
                                                    <IconButton size="small" onClick={() => verifierIntegrite(archive.documentId)}><VerifiedIcon /></IconButton>
                                                    <IconButton size="small" onClick={() => exporterArchive(archive.documentId, archive.reference)}><DownloadIcon /></IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Paper sx={{ p: mobile ? 1.5 : 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: mobile ? 'column' : 'row', gap: 2 }}>
                        <Typography variant={mobile ? "subtitle1" : "h6"}>Documents signés non archivés</Typography>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchNonArchivedDocuments} disabled={loadingNonArchived} fullWidth={mobile}>Actualiser</Button>
                    </Paper>

                    {mobile ? (
                        <Stack spacing={2}>
                            {loadingNonArchived ? <CircularProgress /> : 
                             filteredNonArchived.length === 0 ? <Typography textAlign="center">Aucun document à archiver</Typography> : 
                             filteredNonArchived.map((doc) => (
                                <Paper key={doc.id} sx={{ p: 2 }}>
                                    <Stack spacing={1}>
                                        <Typography variant="body2" fontWeight="bold">{doc.nom}</Typography>
                                        <Typography variant="caption">Créé: {new Date(doc.dateCreation).toLocaleDateString()}</Typography>
                                        <Chip label={doc.estSigne ? "Signé" : "Non signé"} size="small" color={doc.estSigne ? "success" : "warning"} />
                                        <Button variant="contained" size="small" startIcon={<ArchiveIcon />} onClick={() => { setSelectedDocToArchive(doc); setOpenArchiveDialog(true); }}>Archiver</Button>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Nom du document</TableCell>
                                        <TableCell>Date création</TableCell>
                                        <TableCell>Statut</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadingNonArchived ? <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow> : 
                                     filteredNonArchived.length === 0 ? <TableRow><TableCell colSpan={5} align="center">Aucun document à archiver</TableCell></TableRow> : 
                                     filteredNonArchived.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell>{doc.id}</TableCell>
                                            <TableCell>{doc.nom}</TableCell>
                                            <TableCell>{new Date(doc.dateCreation).toLocaleDateString()}</TableCell>
                                            <TableCell><Chip label={doc.estSigne ? "Signé" : "Non signé"} size="small" color={doc.estSigne ? "success" : "warning"} /></TableCell>
                                            <TableCell align="center">
                                                <Button variant="contained" size="small" startIcon={<ArchiveIcon />} onClick={() => { setSelectedDocToArchive(doc); setOpenArchiveDialog(true); }}>
                                                    Archiver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {/* Dialog d'archivage manuel */}
            <Dialog open={openArchiveDialog} onClose={() => setOpenArchiveDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <ArchiveIcon />
                        <Typography variant="h6">Archiver un document</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {selectedDocToArchive && (
                        <Stack spacing={3}>
                            <Alert severity="info">Document : <strong>{selectedDocToArchive.nom}</strong></Alert>
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>Niveau d'archivage :</Typography>
                                <Stack direction={mobile ? "column" : "row"} spacing={2}>
                                    <Button variant={archiveLevel === 'STANDARD' ? 'contained' : 'outlined'} onClick={() => setArchiveLevel('STANDARD')} fullWidth>Standard</Button>
                                    <Button variant={archiveLevel === 'LEGAL' ? 'contained' : 'outlined'} onClick={() => setArchiveLevel('LEGAL')} fullWidth sx={{ bgcolor: archiveLevel === 'LEGAL' ? '#1a237e' : undefined }}>Légal</Button>
                                    <Button variant={archiveLevel === 'CERTIFIE' ? 'contained' : 'outlined'} onClick={() => setArchiveLevel('CERTIFIE')} fullWidth>Certifié</Button>
                                </Stack>
                            </Box>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                                <Typography variant="caption" color="textSecondary">
                                    {archiveLevel === 'STANDARD' && "Archivage simple sans preuve légale supplémentaire."}
                                    {archiveLevel === 'LEGAL' && "Archivage avec preuve de conservation et certificat d'archivage (Recommandé)."}
                                    {archiveLevel === 'CERTIFIE' && "Archivage certifié par un tiers de confiance."}
                                </Typography>
                            </Paper>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenArchiveDialog(false)}>Annuler</Button>
                    <Button onClick={archiverDocumentManuel} variant="contained" disabled={loading} sx={{ bgcolor: '#1a237e' }}>
                        {loading ? <CircularProgress size={24} /> : "Archiver"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ArchivesView;