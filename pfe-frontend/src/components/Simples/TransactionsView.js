import React, { useState, useEffect } from 'react';
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
import SimpleIcon from '@mui/icons-material/EditNote';
import PkiIcon from '@mui/icons-material/Security';

import VerificationReport from './VerificationReport';

const TransactionsView = ({ invitations, loading }) => {
  
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [currentVerificationResult, setCurrentVerificationResult] = useState(null);
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    if (invitations && invitations.length > 0) {
      console.log("=== INVITATIONS REÇUES ===");
      invitations.forEach((inv, idx) => {
        console.log(`Invitation ${idx}:`, {
          id: inv.id,
          typeSignature: inv.typeSignature,
          type_signature: inv.type_signature,
          statut: inv.statut
        });
      });
    }
  }, [invitations]);

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

  const handleDownload = async (documentId, nomFichier, typeSignature) => {
    setDownloading(prev => ({ ...prev, [documentId]: true }));
    try {
      const endpoint = `https://memoiresignaturenumerique.onrender.com/api/documents/download-signe/${documentId}`;
      
      console.log(`Téléchargement document ${documentId} (type: ${typeSignature})`);
      
      const response = await axios.get(endpoint, {
        responseType: 'blob',
        withCredentials: true
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const prefix = typeSignature === 'pki' ? 'SIGNE_PKI_' : 'SIGNE_';
      link.setAttribute('download', `${prefix}${nomFichier || 'document.pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log("✅ Téléchargement réussi");
    } catch (error) {
      console.error("Erreur lors du téléchargement", error);
      let errorMsg = "Impossible de télécharger le document signé.";
      if (error.response?.status === 403) {
        errorMsg = "Accès non autorisé au document.";
      } else if (error.response?.status === 404) {
        errorMsg = "Document non trouvé.";
      }
      alert(`Erreur : ${errorMsg}`);
    } finally {
      setDownloading(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const verifierSignature = async (documentId, nomFichier, typeSignature) => {
    try {
      const response = await axios.post(
        'https://memoiresignaturenumerique.onrender.com/api/signature/verifier-document-signe',
        { documentId: documentId, typeSignature: typeSignature },
        { withCredentials: true }
      );
      
      setCurrentVerificationResult(response.data);
      setOpenReportDialog(true);
      
    } catch (error) {
      console.error("Erreur vérification:", error);
      alert("Erreur lors de la vérification: " + (error.response?.data?.erreur || error.message));
    }
  };

  const getSignatureType = (invitation) => {
    let type = invitation.type_signature || invitation.typeSignature || invitation.type;
    
    if (!type) {
      const fileName = invitation.nomFichier || invitation.documentNom || '';
      if (fileName.includes('PKI') || fileName.includes('SIGNE_PKI')) {
        type = 'pki';
      } else {
        type = 'simple';
      }
    }
    
    const typeLower = String(type).toLowerCase();
    console.log(`Type détecté: ${typeLower} pour invitation ${invitation.id || invitation.documentId}`);
    
    if (typeLower === 'pki' || typeLower === 'pkcs11') {
      return { label: 'PKI', icon: <PkiIcon sx={{ fontSize: 14 }} />, color: 'success', value: 'pki' };
    }
    return { label: 'Simple', icon: <SimpleIcon sx={{ fontSize: 14 }} />, color: 'primary', value: 'simple' };
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
              <TableCell><b>SIGNATAIRE / TYPE</b></TableCell>
              <TableCell><b>CONTACT</b></TableCell>
              <TableCell><b>DATE INVITATION</b></TableCell>
              <TableCell><b>DATE SIGNATURE</b></TableCell>
              <TableCell align="center"><b>STATUT / ACTIONS</b></TableCell>
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
                const docNom = t.nomFichier || t.documentNom || "Document PDF";
                const docId = t.documentId;
                const dateInvitation = t.dateInvitation;
                const dateSignature = t.dateSignature;
                const statutBrut = t.statut || "";
                const estSigne = statutBrut === "SIGNE" || !!dateSignature;
                const isDownloading = downloading[docId];
                
                const signatureType = getSignatureType(t);
                const typeValue = signatureType.value;

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
                      <Chip 
                        icon={signatureType.icon}
                        label={signatureType.label} 
                        size="small" 
                        color={signatureType.color} 
                        variant="outlined"
                        sx={{ mt: 0.5, height: 22, fontSize: '0.7rem' }}
                      />
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
                            <Tooltip title={`Télécharger le document signé (${signatureType.label})`}>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={() => handleDownload(docId, docNom, typeValue)}
                                disabled={isDownloading}
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            {/* ✅ Bouton de vérification UNIQUEMENT pour PKI */}
                            {typeValue === 'pki' && (
                              <Tooltip title="Vérifier la signature numérique PKI">
                                <IconButton 
                                  size="small" 
                                  color="success" 
                                  onClick={() => verifierSignature(docId, docNom, typeValue)}
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

      {/* Légende des types de signature */}
      <Paper 
        elevation={0} 
        sx={{ 
          mt: 3, 
          p: 2, 
          bgcolor: '#f8f9fa', 
          borderRadius: '12px',
          border: '1px solid #E2E8F0'
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#0b1e39' }}>
            Types de signature :
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip 
              icon={<SimpleIcon sx={{ fontSize: 14 }} />}
              label="Signature Simple" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Typography variant="caption" color="textSecondary">
              Signature électronique simple avec OTP
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip 
              icon={<PkiIcon sx={{ fontSize: 14 }} />}
              label="Signature PKI" 
              size="small" 
              color="success" 
              variant="outlined"
            />
            <Typography variant="caption" color="textSecondary">
              Signature avec certificat numérique (qualifiée)
            </Typography>
          </Stack>
        </Stack>
      </Paper>

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