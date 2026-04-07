// components/VerificationReport.jsx
import React from 'react';
import { 
    Box, Paper, Typography, Stack, Chip, Divider, Grid, Table, 
    TableBody, TableCell, TableContainer, TableHead, TableRow ,Button  
} from '@mui/material';
import { VerifiedUser, Error, Security, Download } from '@mui/icons-material';

const VerificationReport = ({ verificationResult, onClose }) => {
    const estValide = verificationResult?.documentIntegre === true;
    
    // Fonction pour imprimer / sauvegarder en PDF
    const handlePrint = () => {
        window.print();
    };

    return (
        <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
            {/* En-tête du rapport */}
            <Paper sx={{ p: 3, mb: 2, bgcolor: estValide ? '#e8f5e9' : '#ffebee' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    {estValide ? (
                        <VerifiedUser sx={{ fontSize: 48, color: '#2e7d32' }} />
                    ) : (
                        <Error sx={{ fontSize: 48, color: '#d32f2f' }} />
                    )}
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            {estValide ? "✅ SIGNATURE VALIDE" : "❌ SIGNATURE INVALIDE"}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Rapport de vérification de signature numérique
                        </Typography>
                    </Box>
                </Stack>
            </Paper>

            {/* Informations du document */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    📄 Informations du document
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Nom du fichier</Typography>
                        <Typography variant="body2">{verificationResult?.nomFichier}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Date de vérification</Typography>
                        <Typography variant="body2">{new Date().toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Intégrité du document</Typography>
                        <Chip 
                            label={estValide ? "Document intègre" : "Document altéré"}
                            color={estValide ? "success" : "error"}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Détails des signatures */}
            <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    🔐 Détails des signatures
                </Typography>
                
                {verificationResult?.signatures?.map((sig, idx) => (
                    <Box key={idx} sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            Signature #{idx + 1}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="textSecondary">Signataire</Typography>
                                <Typography variant="body2" fontWeight="bold">{sig.nomSignataire || 'Inconnu'}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Date de signature</Typography>
                                <Typography variant="body2">
                                    {sig.dateSignature ? new Date(sig.dateSignature).toLocaleString() : 'Non renseignée'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Statut certificat</Typography>
                                <Chip 
                                    label={sig.certificatValide ? "Certificat valide" : sig.certificatStatut || "Certificat invalide"}
                                    color={sig.certificatValide ? "success" : "error"}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="textSecondary">Sujet du certificat</Typography>
                                <Typography variant="body2" sx={{ fontSize: '12px', wordBreak: 'break-all' }}>
                                    {sig.certificatSujet || 'Non disponible'}
                                </Typography>
                            </Grid>
                            {sig.certificatExpiration && (
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="textSecondary">Date d'expiration</Typography>
                                    <Typography variant="body2" color="error">
                                        {new Date(sig.certificatExpiration).toLocaleString()}
                                        {new Date(sig.certificatExpiration) < new Date() && " (EXPIRÉ)"}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                ))}
            </Paper>

            {/* Cachet de validation officiel */}
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                <Security sx={{ fontSize: 40, color: '#1a237e', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                    Rapport généré par TrustSign CA - Autorité de certification
                </Typography>
                <Typography variant="caption" color="textSecondary">
                    Conformité ISO 27005 / eIDAS
                </Typography>
            </Paper>

            {/* Boutons d'action */}
            <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={onClose}>
                    Fermer
                </Button>
                <Button variant="contained" startIcon={<Download />} onClick={handlePrint}>
                    Imprimer / Sauvegarder PDF
                </Button>
            </Stack>
        </Box>
    );
};

export default VerificationReport;