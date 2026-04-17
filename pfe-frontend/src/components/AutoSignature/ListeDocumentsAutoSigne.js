import React, { useState, useEffect } from 'react';
import { Download, Delete, PictureAsPdf } from '@mui/icons-material';
import axios from 'axios';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, useMediaQuery, Card, CardContent } from '@mui/material';

const ListeDocumentsAutoSignes = ({ setSnackbar, isMobile = false }) => {
    const [documents, setDocuments] = useState([]);
    const API_BASE_URL = 'https://trustsign-backend-3zsj.onrender.com/api/documents';
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    const fetchDocuments = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/liste-signes-auto`, { withCredentials: true });
            setDocuments(res.data);
        } catch (e) {
            console.error("Erreur:", e);
            setSnackbar({ open: true, message: "Erreur lors du chargement", severity: 'error' });
        }
    };

    useEffect(() => { fetchDocuments(); }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer définitivement ce document ?")) {
            try {
                await axios.delete(`${API_BASE_URL}/supprimer/${id}`, { withCredentials: true });
                setSnackbar({ open: true, message: "Document supprimé", severity: 'info' });
                fetchDocuments();
            } catch (e) {
                setSnackbar({ open: true, message: "Erreur suppression", severity: 'error' });
            }
        }
    };

    const handleDownload = async (id, nom) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/download/${id}`, { responseType: 'blob', withCredentials: true });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const nomFichier = nom.endsWith('.pdf') ? nom : `${nom}.pdf`;
            link.setAttribute('download', nomFichier);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            setSnackbar({ open: true, message: "Erreur téléchargement", severity: 'error' });
        }
    };

    if (mobile) {
        return (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Mes Documents Signés</Typography>
                <Stack spacing={2}>
                    {documents.length === 0 ? (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">Aucun document signé trouvé.</Typography>
                        </Paper>
                    ) : (
                        documents.map((doc) => (
                            <Card key={doc.id} sx={{ borderRadius: '12px' }}>
                                <CardContent>
                                    <Stack spacing={1.5}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <PictureAsPdf color="error" />
                                            <Typography variant="body2" fontWeight="600" sx={{ flex: 1 }}>
                                                {doc.nomFichier?.length > 40 ? doc.nomFichier.substring(0, 40) + '...' : doc.nomFichier}
                                            </Typography>
                                        </Stack>
                                        <Typography variant="caption" color="textSecondary">
                                            Date: {doc.dateCreation ? new Date(doc.dateCreation).toLocaleDateString() : 'N/A'}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button size="small" variant="contained" color="success" startIcon={<Download />} onClick={() => handleDownload(doc.id, doc.nomFichier)} fullWidth>
                                                Télécharger
                                            </Button>
                                            <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDelete(doc.id)} fullWidth>
                                                Supprimer
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Mes Documents Signés</Typography>
            <TableContainer component={Paper} elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Document</TableCell>
                            <TableCell>Date de création</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {documents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} align="center">Aucun document signé trouvé.</TableCell>
                            </TableRow>
                        ) : (
                            documents.map((doc) => (
                                <TableRow key={doc.id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <PictureAsPdf color="error" />
                                            <Typography variant="body2">{doc.nomFichier}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{doc.dateCreation ? new Date(doc.dateCreation).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Button size="small" variant="contained" color="success" startIcon={<Download />} onClick={() => handleDownload(doc.id, doc.nomFichier)}>
                                                Télécharger
                                            </Button>
                                            <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDelete(doc.id)}>
                                                Supprimer
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ListeDocumentsAutoSignes;