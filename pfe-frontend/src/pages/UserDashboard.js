import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { 
  Box, CssBaseline, Snackbar, Alert, useMediaQuery, 
  Drawer, IconButton, AppBar, Toolbar, Typography 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

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
  
  // Responsive states
  const isMobile = useMediaQuery('(max-width:600px)');
  const isTablet = useMediaQuery('(max-width:960px)');
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handlePreviewDocument = () => {
    if (uploadedFiles.length > 0) {
      const fileURL = URL.createObjectURL(uploadedFiles[0]);
      window.open(fileURL, '_blank');
    }
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

  const handleLaunchPad = async (signataire, signatureType) => {
    if (uploadedFiles.length > 0) {
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
        message: `Invitation ${typeSig === 'pki' ? 'PKI' : 'simple'} envoyée avec succès à ${signataireInfo.email} !`, 
        severity: 'success' 
      });
      setStep(1);
      setUploadedFiles([]);
      setAddedSignataires([]);
      if (isMobile) setMobileOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: "Erreur lors de l'envoi de l'invitation.", severity: 'error' });
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles.filter(f => f.type === 'application/pdf')]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop, noClick: true });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f4f7f9', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1a237e' }}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              TrustSign
            </Typography>
            <Header setView={setView} userData={userData} isMobile={isMobile} />
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar with responsive drawer */}
      <Sidebar 
        view={view} 
        setView={(newView) => {
          setView(newView);
          if (isMobile) setMobileOpen(false);
        }} 
        openAutoSig={openAutoSig} 
        setOpenAutoSig={setOpenAutoSig} 
        openProfile={openProfile} 
        setOpenProfile={setOpenProfile} 
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        isMobile={isMobile}
      />
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: { xs: '100%', sm: `calc(100% - ${isMobile ? 0 : 240}px)` },
          mt: { xs: '64px', sm: 0 }
        }}
      >
        {!isMobile && <Header setView={setView} userData={userData} isMobile={isMobile} />}
        
        <Box sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 2, sm: 3 }
        }}>
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
                  isMobile={isMobile}
                />
              )}
              {step === 2 && (
                <StepConfig 
                  prevStep={() => setStep(1)} 
                  onLaunchPad={handleLaunchPad} 
                  onPreview={handlePreviewDocument}
                  setSnackbar={setSnackbar} 
                  addedSignataires={addedSignataires} 
                  setAddedSignataires={setAddedSignataires} 
                  isMobile={isMobile}
                />
              )}
            </>
          )}

          {view === 'transactions' && (
            <TransactionsView 
              invitations={transactions} 
              loading={loadingTransactions} 
              isMobile={isMobile} 
            />
          )}

          {view === 'certificat' && (
            <CertificatView 
              currentStatus={userData.status_pki || userData.statut}
              onStatusRefresh={fetchUserProfile} 
              setSnackbar={setSnackbar} 
              isMobile={isMobile}
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
              isMobile={isMobile}
            />
          )}

          {view === 'securite' && (
            <SecurityView 
              passwordData={passwordData} 
              setPasswordData={setPasswordData} 
              handleChangePassword={handleChangePassword} 
              isMobile={isMobile}
            />
          )}
          
          {view === 'ma-signature' && (
            <SignatureView 
              setSnackbar={setSnackbar}
              onSignatureSaved={() => { fetchUserProfile(); }}
              isMobile={isMobile}
            />
          )}

          {view === 'auto-signature' && (
            <AutoSignatureDocument 
              setSnackbar={setSnackbar} 
              isMobile={isMobile} 
            />
          )}
          
          {view === 'liste-auto-signe' && (
            <ListeDocumentsAutoSigne 
              setSnackbar={setSnackbar} 
              isMobile={isMobile} 
            />
          )}
        </Box>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'left' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserDashboard;