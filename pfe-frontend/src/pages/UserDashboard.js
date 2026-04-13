import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { Box, CssBaseline, Snackbar, Alert } from '@mui/material';

// Composants externalisés (dashboard)
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import ProfileView from '../components/dashboard/ProfileView';
import SecurityView from '../components/dashboard/SecurityView';
import SignatureView from '../components/dashboard/SignatureView';
import CertificatView from '../components/dashboard/CertificatView';

import AutoSignatureDocument from '../components/AutoSignature/AutoSignatureDocument'; 
import ListeDocumentsAutoSigne from '../components/AutoSignature/ListeDocumentsAutoSigne';
import SignaturesView from '../components/Simples/SignaturesView';
import StepConfig from '../components/Simples/StepConfig';
import TransactionsView from '../components/Simples/TransactionsView';

const UserDashboard = () => {
  const [view, setView] = useState('signatures');
  const [openAutoSig, setOpenAutoSig] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [step, setStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [addedSignataires, setAddedSignataires] = useState([]);
  const [userData, setUserData] = useState({ email: '', telephone: '', prenom: '', nom: '', statut: 'NONE' });
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => { fetchUserProfile(); }, []);
  useEffect(() => { if (view === 'transactions') fetchTransactions(); }, [view]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/utilisateur/mon-profil', { withCredentials: true });
      setUserData(response.data);
    } catch (error) { console.error("Erreur profil:", error); }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await axios.get('https://memoiresignaturenumerique.onrender.com/api/documents/mes-invitations', { withCredentials: true });
      setTransactions(response.data);
    } catch (error) {
      setSnackbar({ open: true, message: "Erreur lors de la récupération des transactions.", severity: 'error' });
    } finally { setLoadingTransactions(false); }
  };

  const handleUpdateProfil = async () => {
    try {
      await axios.put('https://memoiresignaturenumerique.onrender.com/api/utilisateur/modifier-profil', userData, { withCredentials: true });
      setSnackbar({ open: true, message: 'Profil mis à jour !', severity: 'success' });
      setIsEditing(false);
    } catch (error) {
      setSnackbar({ open: true, message: "Erreur de mise à jour.", severity: 'error' });
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({ open: true, message: "Les mots de passe ne correspondent pas.", severity: 'error' });
      return;
    }
    try {
      await axios.put('https://memoiresignaturenumerique.onrender.com/api/utilisateur/modifier-mot-de-passe', {
        ancienMotDePasse: passwordData.oldPassword,
        nouveauMotDePasse: passwordData.newPassword
      }, { withCredentials: true });
      setSnackbar({ open: true, message: "Mot de passe modifié avec succès !", severity: 'success' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.erreur || "Erreur lors du changement.", severity: 'error' });
    }
  };

  // CORRECTION : L'expéditeur ne sélectionne plus la position, on envoie directement
  const handleLaunchPad = async (signataire, signatureType) => {
    if (uploadedFiles.length > 0) {
      // Coordonnées par défaut (0,0) car c'est le destinataire qui choisira ou le backend
      const defaultPosition = { x: 0, y: 0, page: 1 };
      await handleFinalConfirm(defaultPosition, signataire, signatureType);
    } else {
      setSnackbar({ open: true, message: "Aucun document sélectionné.", severity: 'error' });
    }
  };

  const handleFinalConfirm = async (position, signataireInfo, typeSig) => {
    const file = uploadedFiles[0];
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await axios.post('https://memoiresignaturenumerique.onrender.com/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      const payload = {
        documentId: uploadResponse.data.id,
        emailDestinataire: signataireInfo.email,
        telephone: signataireInfo.telephone,
        nom: signataireInfo.nom,
        prenom: signataireInfo.prenom,
        x: position.x,
        y: position.y,
        pageNumber: position.page || 1,
        typeSignature: typeSig
      };
      
      await axios.post('https://memoiresignaturenumerique.onrender.com/api/signature/creer-transaction', payload, { withCredentials: true });
      
      setSnackbar({ 
        open: true, 
        message: `Invitation ${typeSig === 'pki' ? 'PKI' : 'simple'} envoyée à ${signataireInfo.email} !`, 
        severity: 'success' 
      });
      setStep(1);
      setUploadedFiles([]);
      setAddedSignataires([]);
    } catch (error) {
      setSnackbar({ open: true, message: "Erreur lors de l'envoi.", severity: 'error' });
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles.filter(f => f.type === 'application/pdf')]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, noClick: true });

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f4f7f9', minHeight: '100vh' }}>
      <CssBaseline />
      
      <Sidebar 
        view={view} 
        setView={setView} 
        openAutoSig={openAutoSig} 
        setOpenAutoSig={setOpenAutoSig} 
        openProfile={openProfile} 
        setOpenProfile={setOpenProfile} 
      />
      
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Header setView={setView} userData={userData} />
        
        <Box sx={{ p: 4 }}>
          {view === 'signatures' && (
            <>
              {step === 1 && (
                <SignaturesView 
                  getRootProps={getRootProps} 
                  getInputProps={getInputProps} 
                  isDragActive={isDragActive} 
                  open={open} 
                  uploadedFiles={uploadedFiles} 
                  removeFile={(i) => setUploadedFiles(uploadedFiles.filter((_, idx) => idx !== i))} 
                  nextStep={() => setStep(2)} 
                />
              )}
              {step === 2 && (
                <StepConfig 
                  prevStep={() => setStep(1)} 
                  onLaunchPad={handleLaunchPad} 
                  setSnackbar={setSnackbar} 
                  addedSignataires={addedSignataires} 
                  setAddedSignataires={setAddedSignataires} 
                />
              )}
              {/* L'étape 3 (SignaturePad) est retirée du flux expéditeur */}
            </>
          )}

          {view === 'transactions' && (
            <TransactionsView invitations={transactions} loading={loadingTransactions} />
          )}

          {view === 'certificat' && (
            <CertificatView 
              currentStatus={userData.status_pki || userData.statut}
              onStatusRefresh={fetchUserProfile} 
              setSnackbar={setSnackbar} 
            />
          )}

          {view === 'mes-informations' && (
              <ProfileView 
                  userData={userData} 
                  setUserData={setUserData} 
                  isEditing={isEditing} 
                  setIsEditing={setIsEditing} 
                  handleUpdateProfil={handleUpdateProfil} 
                  setSnackbar={setSnackbar}
              />
          )}

          {view === 'securite' && (
            <SecurityView 
              passwordData={passwordData} 
              setPasswordData={setPasswordData} 
              handleChangePassword={handleChangePassword} 
            />
          )}
          
          {view === 'ma-signature' && (
              <SignatureView 
                  setSnackbar={setSnackbar}
                  onSignatureSaved={() => { fetchUserProfile(); }}
              />
          )}

          {view === 'auto-signature' && (
            <AutoSignatureDocument setSnackbar={setSnackbar} />
          )}
          
          {view === 'liste-auto-signe' && (
            <ListeDocumentsAutoSigne setSnackbar={setSnackbar} />
          )}
        </Box>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UserDashboard;