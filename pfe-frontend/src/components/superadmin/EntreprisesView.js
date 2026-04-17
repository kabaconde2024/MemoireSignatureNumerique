// components/superadmin/EntreprisesView.jsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Avatar, Stack } from '@mui/material';
import { Business, Edit, Block, CheckCircle } from '@mui/icons-material';
import axios from 'axios';

const EntreprisesView = ({ setSnackbar }) => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://trustsign-backend-3zsj.onrender.com/api/admin/entreprises', { withCredentials: true });
            setCompanies(response.data);
        } catch (error) {
            console.error("Erreur:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="800" sx={{ mb: 4, color: '#1a237e' }}>
                Entreprises clientes
            </Typography>

            <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><b>Entreprise</b></TableCell>
                            <TableCell><b>Matricule fiscal</b></TableCell>
                            <TableCell><b>Statut</b></TableCell>
                            <TableCell><b>Date création</b></TableCell>
                            <TableCell align="center"><b>Actions</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center">Chargement...</TableCell></TableRow>
                        ) : companies.length === 0 ? (
                            <TableRow><TableCell colSpan={5} align="center">Aucune entreprise trouvée</TableCell></TableRow>
                        ) : (
                            companies.map((comp) => (
                                <TableRow key={comp.id} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Avatar sx={{ bgcolor: '#ffc107', width: 32, height: 32 }}>
                                                <Business sx={{ fontSize: 18 }} />
                                            </Avatar>
                                            <Typography variant="body2" fontWeight="bold">{comp.nom}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{comp.matriculeFiscal || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Chip label={comp.estValidee ? "Validée" : "En attente"} size="small" color={comp.estValidee ? "success" : "warning"} />
                                    </TableCell>
                                    <TableCell>{new Date(comp.dateCreation).toLocaleDateString()}</TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" color="primary"><Edit /></IconButton>
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

export default EntreprisesView;