import React, { useState } from 'react';
import axios from 'axios';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Chip, Stack, IconButton, Tooltip,
  Dialog
} from '@mui/material';
import Description from '@mui/icons-material/Description';
import PhoneIcon from '@mui/icons-material/Phone';
import DownloadIcon from '@mui/icons-material/GetApp';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import VerificationReport from './VerificationReport';


const TransactionsView = ({ invitations, loading }) => {
  
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [currentVerificationResult, setCurrentVerificationResult] = useState(null);

  const formatDate = (dateValue) => {
    if (!dateValue) return '—';

    try {
      let date;
      
      if (Array.isArray(dateValue)) {
        const [y, m, d, h = 0, min = 0, s = 0] = dateValue;
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(d)}/${pad(m)}/${y} à ${pad(h)}:${pad(min)}:${pad(s)}`;
      }

      const dateString = typeof dateValue === 'string' ? dateValue.replace(' ', 'T') : dateValue;
      date = new Date(dateString);
      
      if (!isNaN(date.getTime())) {
        const d = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const t = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `${d} à ${t}`;
      }
      
      return 'Format invalide';
    } catch (e) {
      console.error("Erreur formatage date:", e);
      return 'Erreur date';
    }
  };

  const handleDownload = async (documentId, nomFichier) => {
    try {
      const response = await axios.get(`https://memoiresignaturenumerique.onrender.com/api/documents/download-signe/${documentId}`, {
        responseType: 'blob',
        withCredentials: true
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomFichier || 'document_signe.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors du téléchargement", error);
      alert("Erreur : Impossible de contacter le serveur sécurisé sur le port 8443.");
    }
  };

  const verifierSignature = async (documentId, nomFichier) => {
    try {
      const response = await axios.post(
        'https://memoiresignaturenumerique.onrender.com/api/signature/verifier-document-signe',
        { documentId: documentId },
        { withCredentials: true }
      );
      
      setCurrentVerificationResult(response.data);
      setOpenReportDialog(true);
      
    } catch (error) {
      console.error("Erreur vérification:", error);
      alert("Erreur lors de la vérification: " + (error.response?.data?.erreur || error.message));
    }
  };

  return (
    <Box sx={{ maxWidth: '1300px', mx: 'auto', width: '100%' }}>
      <Typography variant="h5" fontWeight="800" sx={{ mb: 4, color: '#0b1e39' }}>
        Historique des Transactions
      </Typography>
      
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '15px' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell><b>DOCUMENT</b></TableCell>
              <TableCell><b>SIGNATAIRE</b></TableCell>
              <TableCell><b>CONTACT</b></TableCell>
              <TableCell><b>DATE INVITATION</b></TableCell>
              <TableCell><b>DATE SIGNATURE</b></TableCell>
              <TableCell align="center"><b>STATUT / ACTION</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center">Chargement...</TableCell></TableRow>
            ) : !invitations || invitations.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">Aucune transaction trouvée.</TableCell></TableRow>
            ) : (
              invitations.map((t, index) => {
                const nom = t.nom_signataire || t.nomSignataire || "";
                const prenom = t.prenom_signataire || t.prenomSignataire || "";
                const email = t.email_destinataire || t.emailDestinataire || "N/A";
                const telephone = t.telephone_signataire || t.telephoneSignataire || "N/A";
                const docNom = t.document_nom || t.documentNom || t.nomFichier || "Document PDF";
                const docId = t.document_id || t.documentId;
                
                const dateInvitation = t.date_invitation || t.dateInvitation;
                const dateSignature = t.date_signature || t.dateSignature;
                const typeSignature = t.type_signature || t.typeSignature;

                const statutBrut = t.statut || "";
                const estSigne = statutBrut === "SIGNE" || !!dateSignature;
                const isPkiSignature = typeSignature === 'pki';

                return (
                  <TableRow key={t.id || index} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Description color="error" fontSize="small" />
                        <Typography variant="body2" fontWeight="600">{docNom}</Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{`${prenom} ${nom}`.trim() || "Inconnu"}</Typography>
                      {isPkiSignature && (
                        <Chip 
                          label="PKI" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ mt: 0.5, height: 18, fontSize: '0.6rem' }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0b1e39' }}>{email}</Typography>
                      {telephone !== "N/A" && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary', mt: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{telephone}</Typography>
                        </Stack>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                        {formatDate(dateInvitation)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: dateSignature ? 'success.main' : 'text.disabled', 
                          fontWeight: dateSignature ? 600 : 400,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatDate(dateSignature)}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                        <Chip 
                          label={estSigne ? "Signé" : "En attente"} 
                          color={estSigne ? "success" : "warning"} 
                          size="small" 
                          sx={{ fontWeight: 'bold', minWidth: '95px' }}
                        />
                        {estSigne && docId && (
                          <>
                            <Tooltip title="Télécharger le document signé">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={() => handleDownload(docId, docNom)}
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {isPkiSignature && (
                              <Tooltip title="Vérifier la signature numérique">
                                <IconButton 
                                  size="small" 
                                  color="success" 
                                  onClick={() => verifierSignature(docId, docNom)}
                                >
                                  <VerifiedUserIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog pour le rapport de vérification */}
      <Dialog 
        open={openReportDialog} 
        onClose={() => setOpenReportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <VerificationReport 
          verificationResult={currentVerificationResult}
          onClose={() => setOpenReportDialog(false)}
        />
      </Dialog>
    </Box>
  );
};

export default TransactionsView;