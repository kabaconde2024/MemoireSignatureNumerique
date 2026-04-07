// components/superadmin/ArchivesView.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Grid, Card, CardContent, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, CircularProgress, Alert, Stack, Tooltip, Divider,
    Tabs, Tab, TabPanel
} from '@mui/material';
import {
    Archive as ArchiveIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Verified as VerifiedIcon,
    Warning as WarningIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    CheckCircle as CheckCircleIcon,
    Add as AddIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';
import axios from 'axios';

const ArchivesView = ({ setSnackbar }) => {
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
    const [stats, setStats] = useState({
        total: 0,
        actives: 0,
        expirees: 0,
        tailleTotale: 0
    });

    // Charger la liste des archives
    const fetchArchives = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://localhost:8443/api/archivage/liste', {
                withCredentials: true
            });
            setArchives(response.data);
            calculerStats(response.data);
        } catch (error) {
            console.error("Erreur chargement archives:", error);
            setSnackbar({ open: true, message: "Erreur lors du chargement des archives", severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Charger les documents non archivés
    const fetchNonArchivedDocuments = async () => {
        setLoadingNonArchived(true);
        try {
            const response = await axios.get('https://localhost:8443/api/archivage/documents-non-archives', {
                withCredentials: true
            });
            setNonArchivedDocs(response.data);
        } catch (error) {
            console.error("Erreur chargement documents non archivés:", error);
            // Si l'endpoint n'existe pas encore, on utilise une alternative
            setSnackbar({ open: true, message: "Erreur lors du chargement des documents non archivés", severity: 'error' });
        } finally {
            setLoadingNonArchived(false);
        }
    };

    const calculerStats = (data) => {
        const actives = data.filter(a => a.statut === 'ACTIF').length;
        const expirees = data.filter(a => new Date(a.dateExpiration) < new Date()).length;
        const tailleTotale = data.reduce((sum, a) => sum + parseFloat(a.tailleArchive || 0), 0);
        
        setStats({
            total: data.length,
            actives,
            expirees,
            tailleTotale: tailleTotale.toFixed(2)
        });
    };

    // Archiver un document manuellement
    const archiverDocumentManuel = async () => {
        if (!selectedDocToArchive) return;
        
        setLoading(true);
        try {
            const response = await axios.post(
                `https://localhost:8443/api/archivage/archiver/${selectedDocToArchive.id}?niveau=${archiveLevel}`,
                {},
                { withCredentials: true }
            );
            
            setSnackbar({ 
                open: true, 
                message: `Document "${selectedDocToArchive.nom}" archivé avec succès - Réf: ${response.data.reference}`, 
                severity: 'success' 
            });
            
            // Fermer le dialog et rafraîchir les listes
            setOpenArchiveDialog(false);
            setSelectedDocToArchive(null);
            fetchArchives();
            fetchNonArchivedDocuments();
            
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Erreur lors de l'archivage";
            setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Vérifier l'intégrité d'une archive
    const verifierIntegrite = async (documentId) => {
        try {
            const response = await axios.get(`https://localhost:8443/api/archivage/verifier/${documentId}`, {
                withCredentials: true
            });
            setSnackbar({ 
                open: true, 
                message: response.data.integre ? "Archive intègre ✅" : "Archive corrompue ❌", 
                severity: response.data.integre ? 'success' : 'error' 
            });
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur lors de la vérification", severity: 'error' });
        }
    };

    // Exporter une archive
    const exporterArchive = async (documentId, reference) => {
        try {
            const response = await axios.get(`https://localhost:8443/api/archivage/exporter/${documentId}`, {
                withCredentials: true,
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `archive_${reference}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            setSnackbar({ open: true, message: "Archive exportée avec succès", severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur lors de l'export", severity: 'error' });
        }
    };

    // Supprimer une archive expirée
    const supprimerArchive = async (archiveId) => {
        if (!window.confirm("Confirmer la suppression de cette archive ?")) return;
        
        try {
            await axios.delete(`https://localhost:8443/api/archivage/${archiveId}`, {
                withCredentials: true
            });
            setSnackbar({ open: true, message: "Archive supprimée avec succès", severity: 'success' });
            fetchArchives();
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: 'error' });
        }
    };

    // Purger toutes les archives expirées
    const purgerArchivesExpirees = async () => {
        if (!window.confirm("⚠️ Cette action supprimera définitivement toutes les archives expirées. Continuer ?")) return;
        
        try {
            const response = await axios.delete('https://localhost:8443/api/archivage/purger', {
                withCredentials: true
            });
            setSnackbar({ 
                open: true, 
                message: `${response.data.archivesPurgees} archive(s) purgée(s) avec succès`, 
                severity: 'success' 
            });
            fetchArchives();
        } catch (error) {
            setSnackbar({ open: true, message: "Erreur lors de la purge", severity: 'error' });
        }
    };

    // Voir les détails d'une archive
    const voirDetails = (archive) => {
        setSelectedArchive(archive);
        setOpenDetailDialog(true);
    };

    // Ouvrir le dialog d'archivage manuel
    const openManualArchiveDialog = (doc) => {
        setSelectedDocToArchive(doc);
        setArchiveLevel('LEGAL');
        setOpenArchiveDialog(true);
    };

    useEffect(() => {
        fetchArchives();
        fetchNonArchivedDocuments();
    }, []);

    const filteredArchives = archives.filter(archive => 
        archive.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        archive.documentNom?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredNonArchived = nonArchivedDocs.filter(doc =>
        doc.nom?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box>
            {/* Onglets */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                    <Tab label="Archives existantes" icon={<ArchiveIcon />} iconPosition="start" />
                    <Tab label="Documents à archiver" icon={<DescriptionIcon />} iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Onglet 1: Archives existantes */}
            {activeTab === 0 && (
                <Box>
                    {/* Statistiques */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                                    <Typography variant="body2" color="textSecondary">Total archives</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ bgcolor: '#e8f5e9' }}>
                                <CardContent>
                                    <Typography variant="h4" fontWeight="bold" color="success.main">{stats.actives}</Typography>
                                    <Typography variant="body2" color="textSecondary">Archives actives</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ bgcolor: '#fff3e0' }}>
                                <CardContent>
                                    <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.expirees}</Typography>
                                    <Typography variant="body2" color="textSecondary">Archives expirées</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h4" fontWeight="bold">{stats.tailleTotale} Mo</Typography>
                                    <Typography variant="body2" color="textSecondary">Taille totale</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Actions */}
                    <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Rechercher une archive..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                            sx={{ width: 300 }}
                        />
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={fetchArchives}
                                disabled={loading}
                            >
                                Actualiser
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={purgerArchivesExpirees}
                            >
                                Purger les expirées
                            </Button>
                        </Stack>
                    </Paper>

                    {/* Tableau des archives */}
                    <Paper>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableCell>Référence</TableCell>
                                        <TableCell>Document</TableCell>
                                        <TableCell>Date archivage</TableCell>
                                        <TableCell>Expiration</TableCell>
                                        <TableCell>Niveau</TableCell>
                                        <TableCell>Statut</TableCell>
                                        <TableCell>Taille</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                <CircularProgress />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredArchives.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">
                                                <Typography variant="body2" color="textSecondary">Aucune archive trouvée</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredArchives.map((archive) => (
                                            <TableRow key={archive.id}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="medium">{archive.reference}</Typography>
                                                </TableCell>
                                                <TableCell>{archive.documentNom || '-'}</TableCell>
                                                <TableCell>{new Date(archive.dateArchivage).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    {new Date(archive.dateExpiration).toLocaleDateString()}
                                                    {new Date(archive.dateExpiration) < new Date() && (
                                                        <Chip label="Expirée" size="small" color="warning" sx={{ ml: 1 }} />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={archive.niveau}
                                                        size="small"
                                                        color={archive.niveau === 'LEGAL' ? 'primary' : 'default'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={archive.statut}
                                                        size="small"
                                                        color={archive.statut === 'ACTIF' ? 'success' : 'error'}
                                                    />
                                                </TableCell>
                                                <TableCell>{archive.tailleArchive || '-'}</TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Tooltip title="Vérifier intégrité">
                                                            <IconButton size="small" onClick={() => verifierIntegrite(archive.documentId)}>
                                                                <VerifiedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Exporter">
                                                            <IconButton size="small" onClick={() => exporterArchive(archive.documentId, archive.reference)}>
                                                                <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Détails">
                                                            <IconButton size="small" onClick={() => voirDetails(archive)}>
                                                                <SearchIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {new Date(archive.dateExpiration) < new Date() && (
                                                            <Tooltip title="Supprimer (expirée)">
                                                                <IconButton size="small" color="error" onClick={() => supprimerArchive(archive.id)}>
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            {/* Onglet 2: Documents à archiver */}
            {activeTab === 1 && (
                <Box>
                    <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                            Documents signés non archivés
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchNonArchivedDocuments}
                            disabled={loadingNonArchived}
                        >
                            Actualiser
                        </Button>
                    </Paper>

                    <Paper>
                        <TableContainer>
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
                                    {loadingNonArchived ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <CircularProgress />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredNonArchived.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography variant="body2" color="textSecondary">
                                                    Aucun document à archiver. Tous les documents sont déjà archivés.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredNonArchived.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell>{doc.id}</TableCell>
                                                <TableCell>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <DescriptionIcon fontSize="small" color="action" />
                                                        <Typography variant="body2">{doc.nom}</Typography>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{new Date(doc.dateCreation).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={doc.estSigne ? "Signé" : "Non signé"}
                                                        size="small"
                                                        color={doc.estSigne ? "success" : "warning"}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={<ArchiveIcon />}
                                                        onClick={() => openManualArchiveDialog(doc)}
                                                        sx={{ bgcolor: '#1a237e' }}
                                                    >
                                                        Archiver
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            {/* Dialog des détails de l'archive */}
            <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>
                    Détails de l'archive
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {selectedArchive && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="textSecondary">Référence</Typography>
                                <Typography variant="body1">{selectedArchive.reference}</Typography>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="textSecondary">Document</Typography>
                                <Typography variant="body1">{selectedArchive.documentNom || '-'}</Typography>
                            </Box>
                            <Divider />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">Date d'archivage</Typography>
                                    <Typography variant="body2">{new Date(selectedArchive.dateArchivage).toLocaleString()}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="textSecondary">Date d'expiration</Typography>
                                    <Typography variant="body2">{new Date(selectedArchive.dateExpiration).toLocaleString()}</Typography>
                                </Grid>
                            </Grid>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="textSecondary">Hash du document</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                    {selectedArchive.hashArchive}
                                </Typography>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="textSecondary">Certificat d'archivage</Typography>
                                <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: '#f9f9f9' }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                        {selectedArchive.certificatArchive}
                                    </Typography>
                                </Paper>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailDialog(false)}>Fermer</Button>
                </DialogActions>
            </Dialog>

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
                            <Alert severity="info">
                                Vous allez archiver le document : <strong>{selectedDocToArchive.nom}</strong>
                            </Alert>
                            
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>Niveau d'archivage :</Typography>
                                <Stack direction="row" spacing={2}>
                                    <Button
                                        variant={archiveLevel === 'STANDARD' ? 'contained' : 'outlined'}
                                        onClick={() => setArchiveLevel('STANDARD')}
                                        sx={{ flex: 1 }}
                                    >
                                        Standard
                                    </Button>
                                    <Button
                                        variant={archiveLevel === 'LEGAL' ? 'contained' : 'outlined'}
                                        onClick={() => setArchiveLevel('LEGAL')}
                                        sx={{ flex: 1, bgcolor: archiveLevel === 'LEGAL' ? '#1a237e' : undefined }}
                                    >
                                        Légal
                                    </Button>
                                    <Button
                                        variant={archiveLevel === 'CERTIFIE' ? 'contained' : 'outlined'}
                                        onClick={() => setArchiveLevel('CERTIFIE')}
                                        sx={{ flex: 1 }}
                                    >
                                        Certifié
                                    </Button>
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
                    <Button 
                        onClick={archiverDocumentManuel} 
                        variant="contained" 
                        disabled={loading}
                        sx={{ bgcolor: '#1a237e' }}
                    >
                        {loading ? <CircularProgress size={24} /> : "Archiver"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ArchivesView;