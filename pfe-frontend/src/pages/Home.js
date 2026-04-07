import React, { useState, useEffect } from 'react';
import {
  Box, Button, Container, Typography, Stack, AppBar, Toolbar,
  Grid, Paper, Avatar, Fade, Dialog, DialogContent, IconButton,
  Snackbar, Alert, Chip, Stepper, Step, StepLabel, StepConnector, stepConnectorClasses
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';

// Icônes
import ShieldIcon from '@mui/icons-material/Shield';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DrawIcon from '@mui/icons-material/Draw';
import TerminalIcon from '@mui/icons-material/Terminal';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import StorageIcon from '@mui/icons-material/Storage';

import Connexion from './Connexion/Connexion';
import DemandeInscription from './Inscriptions/DemandeInscription';

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3, border: 0, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1,
  },
}));

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openConnexion, setOpenConnexion] = useState(false);
  const [openDemande, setOpenDemande] = useState(false);
  const [notification, setNotification] = useState({ open: false, type: 'success', message: '' });

  const colors = {
    navy: '#0b1e39',
    gold: '#ffc107',
    lightBlue: '#60a5fa',
    darkBg: '#08172d'
  };

  const steps = [
    { label: 'Authentification', icon: <FingerprintIcon />, desc: '2FA / OAuth2' },
    { label: 'Upload & Hash', icon: <CloudUploadIcon />, desc: 'SHA-256' },
    { label: 'Signature', icon: <EnhancedEncryptionIcon />, desc: 'Clé Privée + HSM' },
    { label: 'Horodatage', icon: <HistoryToggleOffIcon />, desc: 'Time Stamping' },
    { label: 'Validation', icon: <FactCheckIcon />, desc: 'Chaîne de Confiance' },
    { label: 'Archivage', icon: <StorageIcon />, desc: 'Preuves immuables' }
  ];

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setNotification({ open: true, type: 'success', message: 'Compte activé avec succès !' });
      setOpenConnexion(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  return (
    <Box sx={{ 
      minHeight: '100vh', color: '#fff', 
      background: `radial-gradient(circle at 10% 15%, ${colors.navy} 0%, ${colors.darkBg} 100%)`, 
      position: 'relative', overflowX: 'hidden'
    }}>
      
      {/* NAVBAR */}
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'rgba(11, 30, 57, 0.8)', backdropFilter: 'blur(15px)', borderBottom: `1px solid rgba(255, 193, 7, 0.2)` }}>
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between', height: 80 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ bgcolor: colors.gold, p: 0.8, borderRadius: '8px', display: 'flex' }}>
                <FingerprintIcon sx={{ fontSize: 28, color: colors.navy }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '1px', lineHeight: 1 }}>Protected Consulting</Typography>
                <Typography variant="caption" sx={{ color: colors.gold, fontWeight: 700, fontSize: '0.65rem' }}>EXPERTISE CYBERSÉCURITÉ</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button onClick={() => setOpenConnexion(true)} sx={{ color: '#fff', textTransform: 'none', fontWeight: 600 }}>Se connecter</Button>
              <Button 
                variant="contained" onClick={() => setOpenDemande(true)}
                sx={{ bgcolor: colors.gold, color: colors.navy, textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#e5ac00' } }}
              >
                Créer un compte
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* HERO SECTION */}
      <Box sx={{ pt: { xs: 15, md: 22 }, pb: 10 }}>
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={7}>
              <Fade in timeout={1000}>
                <Box>
                  <Chip 
                    label="Conformité ANSI (Tunisie) & eIDAS (Europe)" 
                    sx={{ color: colors.gold, borderColor: colors.gold, mb: 3, fontWeight: 700, px: 1 }} 
                    variant="outlined" 
                  />
                  <Typography variant="h1" sx={{ fontWeight: 950, mb: 3, fontSize: { xs: '2.5rem', md: '3.5rem' }, lineHeight: 1.1 }}>
                    Bâtir la <span style={{ color: colors.gold }}>Confiance Numérique</span> avec Protected Consulting.
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#94a3b8', mb: 5, fontSize: '1.1rem', maxWidth: '90%' }}>
                    Leader en Tunisie avec plus de 22 ans d'expertise. Notre plateforme garantit l'intégrité, l'authenticité et la non-répudiation de vos échanges électroniques.
                  </Typography>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button variant="contained" size="large" onClick={() => setOpenDemande(true)} sx={{ bgcolor: colors.gold, color: colors.navy, px: 5, py: 2, fontWeight: 900, borderRadius: '12px' }}>
                      Démarrer un projet
                    </Button>
                    <Button variant="outlined" size="large" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', px: 4, borderRadius: '12px' }} startIcon={<TerminalIcon />}>
                      Audit ISO 27001
                    </Button>
                  </Stack>
                </Box>
              </Fade>
            </Grid>

            <Grid item xs={12} md={5}>
              <Fade in timeout={1500}>
                <Paper elevation={24} sx={{ p: 4, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                  <Stack spacing={3}>
                    <FeatureItem icon={<VerifiedUserIcon sx={{color: colors.gold}} />} title="Infrastructure PKI" desc="Émission de certificats X.509 sécurisés par HSM." />
                    <FeatureItem icon={<DrawIcon sx={{color: colors.gold}} />} title="Valeur Juridique" desc="Conformité stricte à la Loi 2000-83 et au règlement eIDAS." />
                    <FeatureItem icon={<ShieldIcon sx={{color: colors.gold}} />} title="Security by Design" desc="Architecture microservices résiliente sous Spring Boot." />
                  </Stack>
                </Paper>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* SECTION WORKFLOW */}
      <Box sx={{ py: 10, bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" textAlign="center" fontWeight={900} sx={{ mb: 8 }}>
            Le Flux de <span style={{ color: colors.gold }}>Signature Sécurisée</span>
          </Typography>
          
          <Stepper alternativeLabel activeStep={-1} connector={<ColorlibConnector />}>
            {steps.map((step) => (
              <Step key={step.label}>
                <StepLabel 
                  StepIconComponent={() => (
                    <Avatar sx={{ bgcolor: colors.navy, border: `2px solid ${colors.gold}`, color: colors.gold, width: 50, height: 50 }}>
                      {step.icon}
                    </Avatar>
                  )}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#fff' }}>{step.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>{step.desc}</Typography>
                  </Box>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Container>
      </Box>

      {/* MODALES & NOTIFICATIONS */}
      <Dialog open={openConnexion} onClose={() => setOpenConnexion(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton onClick={() => setOpenConnexion(false)} sx={{ position: 'absolute', right: 20, top: 20, zIndex: 10, color: '#64748b' }}><CloseIcon /></IconButton>
          <Connexion onSwitch={() => { setOpenConnexion(false); setOpenDemande(true); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={openDemande} onClose={() => setOpenDemande(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none' } }}>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton onClick={() => setOpenDemande(false)} sx={{ position: 'absolute', right: 20, top: 20, zIndex: 10, color: '#64748b' }}><CloseIcon /></IconButton>
          <DemandeInscription onSwitch={() => { setOpenDemande(false); setOpenConnexion(true); }} />
        </DialogContent>
      </Dialog>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={notification.type} variant="filled" sx={{ borderRadius: '12px' }}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
};

const FeatureItem = ({ icon, title, desc }) => (
  <Stack direction="row" spacing={2} alignItems="flex-start">
    <Avatar sx={{ bgcolor: 'rgba(255, 193, 7, 0.1)', width: 48, height: 48 }}>{icon}</Avatar>
    <Box>
      <Typography variant="subtitle1" fontWeight={800} color="#fff">{title}</Typography>
      <Typography variant="body2" color="#94a3b8">{desc}</Typography>
    </Box>
  </Stack>
);

export default Home;