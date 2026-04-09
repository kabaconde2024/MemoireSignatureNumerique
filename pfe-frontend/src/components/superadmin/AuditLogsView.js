import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, TextField, MenuItem,
    Stack, CircularProgress, Alert, TablePagination
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';

const AuditLogsView = ({ setSnackbar }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterEventType, setFilterEventType] = useState('');
    const [filterUserEmail, setFilterUserEmail] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const eventTypes = [
        'SIGNATURE_DOCUMENT',
        'ENVOI_INVITATION',
        'GENERATION_CERTIFICAT',
        'DEMANDE_CERTIFICAT',
        'APPROBATION_CERTIFICAT',
        'RENOUVELLEMENT_CERTIFICAT',
        'VALIDATION_OTP',
        'AUTO_SIGNATURE',
        'INSCRIPTION',
        'CONNEXION',
        'ACTIVATION_COMPTE'
    ];

    const getStatusColor = (status) => {
        switch(status) {
            case 'SUCCESS': return 'success';
            case 'FAILED': return 'error';
            case 'PENDING': return 'warning';
            default: return 'default';
        }
    };

    const getEventTypeLabel = (type) => {
        switch(type) {
            case 'SIGNATURE_DOCUMENT': return 'Signature document';
            case 'ENVOI_INVITATION': return 'Envoi invitation';
            case 'GENERATION_CERTIFICAT': return 'Génération certificat';
            case 'DEMANDE_CERTIFICAT': return 'Demande certificat';
            case 'APPROBATION_CERTIFICAT': return 'Approbation certificat';
            case 'RENOUVELLEMENT_CERTIFICAT': return 'Renouvellement certificat';
            case 'VALIDATION_OTP': return 'Validation OTP';
            case 'AUTO_SIGNATURE': return 'Auto-signature';
            case 'INSCRIPTION': return 'Inscription';
            case 'CONNEXION': return 'Connexion';
            case 'ACTIVATION_COMPTE': return 'Activation compte';
            default: return type;
        }
    };

    const getSignatureTypeColor = (type) => {
        switch(type) {
            case 'PKI': return 'primary';
            case 'SIMPLE': return 'default';
            case 'AUTO': return 'info';
            default: return 'default';
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let url = 'https://memoiresignaturenumerique.onrender.com/api/admin/audit/logs';
            const params = [];
            if (filterUserEmail) params.push(`userEmail=${encodeURIComponent(filterUserEmail)}`);
            if (filterEventType) params.push(`eventType=${filterEventType}`);
            if (params.length > 0) url += '?' + params.join('&');
            
            const response = await axios.get(url, { withCredentials: true });
            setLogs(response.data);
        } catch (error) {
            console.error('Erreur chargement logs:', error);
            if (setSnackbar) {
                setSnackbar({ open: true, message: 'Erreur chargement des logs', severity: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filterEventType, filterUserEmail]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <Box>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight="bold">
                        📋 Journalisation des signatures (Audit)
                    </Typography>
                    <IconButton onClick={fetchLogs} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Stack>

                <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
                    <TextField
                        label="Filtrer par type d'événement"
                        select
                        value={filterEventType}
                        onChange={(e) => setFilterEventType(e.target.value)}
                        sx={{ minWidth: 250 }}
                        size="small"
                    >
                        <MenuItem value="">Tous</MenuItem>
                        {eventTypes.map(type => (
                            <MenuItem key={type} value={type}>{getEventTypeLabel(type)}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label="Filtrer par email"
                        value={filterUserEmail}
                        onChange={(e) => setFilterUserEmail(e.target.value)}
                        placeholder="exemple@email.com"
                        size="small"
                        sx={{ minWidth: 250 }}
                    />
                </Stack>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={5}>
                        <CircularProgress />
                    </Box>
                ) : logs.length === 0 ? (
                    <Alert severity="info">Aucun log trouvé</Alert>
                ) : (
                    <>
                        <TableContainer sx={{ maxHeight: '70vh' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Événement</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Utilisateur</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Document</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Type signature</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Statut</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Détails</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                                        <TableRow key={log.id} hover>
                                            <TableCell>{formatDate(log.timestamp)}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={getEventTypeLabel(log.eventType)} 
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{log.userEmail || '-'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                    {log.documentName || '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {log.signatureType ? (
                                                    <Chip 
                                                        label={log.signatureType} 
                                                        size="small"
                                                        color={getSignatureTypeColor(log.signatureType)}
                                                        variant="outlined"
                                                    />
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={log.status || 'UNKNOWN'}
                                                    size="small"
                                                    color={getStatusColor(log.status)}
                                                    icon={log.status === 'SUCCESS' ? <CheckCircleIcon /> : log.status === 'FAILED' ? <ErrorIcon /> : log.status === 'PENDING' ? <PendingIcon /> : undefined}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" sx={{ maxWidth: 300, display: 'block', wordBreak: 'break-word' }}>
                                                    {log.details || '-'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[10, 20, 50, 100]}
                            component="div"
                            count={logs.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={(e, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            labelRowsPerPage="Lignes par page"
                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default AuditLogsView;