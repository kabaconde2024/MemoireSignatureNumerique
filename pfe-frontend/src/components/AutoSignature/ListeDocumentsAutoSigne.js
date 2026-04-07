import React, { useState, useEffect } from 'react';
import { Download, Delete, PictureAsPdf } from '@mui/icons-material';
import axios from 'axios';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack } from '@mui/material';

const ListeDocumentsAutoSignes = ({ setSnackbar }) => {
    const [documents, setDocuments] = useState([]);
    // ✅ CORRECTION : Pointer vers le bon contrôleur
    const API_BASE_URL = 'https://localhost:8443/api/documents';

    const fetchDocuments = async () => {
        try {
            // ✅ CORRECTION : Utiliser le mapping qu'on a créé au Backend
            const res = await axios.get(`${API_BASE_URL}/liste-signes-auto`, { withCredentials: true });
            setDocuments(res.data);
        } catch (e) {
            console.error("Erreur chargement liste :", e);
            setSnackbar({ open: true, message: "Erreur lors du chargement des documents", severity: 'error' });
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer définitivement ce document signé du serveur ?")) {
            try {
                // ✅ CORRECTION : L'URL de suppression est maintenant sous /api/documents/
                await axios.delete(`${API_BASE_URL}/supprimer/${id}`, { withCredentials: true });
                setSnackbar({ open: true, message: "Document supprimé", severity: 'info' });
                fetchDocuments(); 
            } catch (e) {
                setSnackbar({ open: true, message: "Erreur suppression (Vérifiez vos droits)", severity: 'error' });
            }
        }
    };

const handleDownload = async (id, nom) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/download/${id}`, {
            responseType: 'blob', // Important pour le PDF binaire
            withCredentials: true
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // On s'assure que l'extension .pdf est présente
        const nomFichier = nom.endsWith('.pdf') ? nom : `${nom}.pdf`;
        
        link.setAttribute('download', nomFichier); 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link); 
    } catch (e) {
        setSnackbar({ open: true, message: "Le fichier signé est introuvable", severity: 'error' });
    }
};

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Mes Documents Signés</Typography>
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
                                            {/* ✅ ATTENTION : Vérifie si c'est doc.nomAffiche ou doc.nomFichier dans ton Java */}
                                            <Typography variant="body2">{doc.nomFichier || doc.nomAffiche}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        {doc.dateCreation ? new Date(doc.dateCreation).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Button 
                                                size="small"
                                                variant="contained" 
                                                color="success" 
                                                startIcon={<Download />}
                                                onClick={() => handleDownload(doc.id, doc.nomFichier)}
                                            >
                                                Télécharger
                                            </Button>
                                            <Button 
                                                size="small"
                                                variant="outlined" 
                                                color="error" 
                                                startIcon={<Delete />}
                                                onClick={() => handleDelete(doc.id)}
                                            >
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