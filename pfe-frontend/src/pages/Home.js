import React, { useState, useEffect } from 'react';
import {
  Box, Button, Container, Typography, Stack, AppBar, Toolbar,
  Grid, Paper, Avatar, Fade, Dialog, DialogContent, IconButton,
  Snackbar, Alert, Chip, Stepper, Step, StepLabel, StepConnector, stepConnectorClasses,
  useMediaQuery
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
import MenuIcon from '@mui/icons-material/Menu';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width:600px)');
  const isTablet = useMediaQuery('(max-width:960px)');
  const isSmallMobile = useMediaQuery('(max-width:380px)');

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

  // Version mobile des steps (carrousel simplifié)
  const mobileSteps = steps.slice(0, 3);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      setNotification({ open: true, type: 'success', message: 'Compte activé avec succès !' });
      setOpenConnexion(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Version desktop du Stepper
  const renderDesktopStepper = () => (
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
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#fff', fontSize: isTablet ? '0.75rem' : '0.875rem' }}>
                {step.label}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: { xs: 'none', md: 'block' } }}>
                {step.desc}
              </Typography>
            </Box>
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );

  // Version tablette du Stepper (3x2)
  const renderTabletStepper = () => (
    <Grid container spacing={3} justifyContent="center">
      {steps.map((step, index) => (
        <Grid item xs={6} sm={4} key={index}>
          <Stack alignItems="center" spacing={1}>
            <Avatar sx={{ bgcolor: colors.navy, border: `2px solid ${colors.gold}`, color: colors.gold, width: 60, height: 60 }}>
              {step.icon}
            </Avatar>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#fff', textAlign: 'center' }}>
              {step.label}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', textAlign: 'center' }}>
              {step.desc}
            </Typography>
          </Stack>
        </Grid>
      ))}
    </Grid>
  );

  // Version mobile du Stepper (simple liste)
  const renderMobileStepper = () => (
    <Stack spacing={3}>
      {steps.map((step, index) => (
        <Paper 
          key={index}
          elevation={0}
          sx={{ 
            p: 2, 
            bgcolor: 'rgba(255,255,255,0.03)', 
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: colors.navy, border: `2px solid ${colors.gold}`, color: colors.gold, width: 48, height: 48 }}>
              {step.icon}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#fff' }}>
                {step.label}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                {step.desc}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh', color: '#fff', 
      background: `radial-gradient(circle at 10% 15%, ${colors.navy} 0%, ${colors.darkBg} 100%)`, 
      position: 'relative', overflowX: 'hidden'
    }}>
      
      {/* NAVBAR */}
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'rgba(64, 123, 51, 0.8)', backdropFilter: 'blur(15px)', borderBottom: `1px solid rgba(255, 193, 7, 0.2)` }}>
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: 'space-between', height: { xs: 70, sm: 80 }, px: { xs: 1, sm: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 1.5}>
              <Box sx={{ bgcolor: colors.gold, p: 0.8, borderRadius: '8px', display: 'flex' }}>
                <FingerprintIcon sx={{ fontSize: isMobile ? 20 : 28, color: colors.navy }} />
              </Box>
              <Box>
                <Typography variant={isMobile ? "body1" : "h5"} fontWeight={900} sx={{ letterSpacing: '1px', lineHeight: 1, fontSize: isMobile ? '0.9rem' : '1.5rem' }}>
                  Protected Consulting
                </Typography>
                {!isSmallMobile && (
                  <Typography variant="caption" sx={{ color: colors.gold, fontWeight: 700, fontSize: isMobile ? '0.55rem' : '0.65rem', display: { xs: 'none', sm: 'block' } }}>
                    EXPERTISE CYBERSÉCURITÉ
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Desktop Menu */}
            {!isMobile && (
              <Stack direction="row" spacing={2}>
                <Button onClick={() => setOpenConnexion(true)} sx={{ color: '#fff', textTransform: 'none', fontWeight: 600 }}>
                  Se connecter
                </Button>
                <Button 
                  variant="contained" onClick={() => setOpenDemande(true)}
                  sx={{ bgcolor: colors.gold, color: colors.navy, textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#e5ac00' } }}
                >
                  Créer un compte
                </Button>
              </Stack>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton color="inherit" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>

          {/* Mobile Menu Dropdown */}
          {isMobile && mobileMenuOpen && (
            <Stack 
              spacing={1} 
              sx={{ 
                pb: 2, 
                px: 2, 
                bgcolor: 'rgba(200, 176, 81, 0.95)', 
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255,193,7,0.2)'
              }}
            >
              <Button 
                fullWidth 
                onClick={() => { setOpenConnexion(true); setMobileMenuOpen(false); }} 
                sx={{ color: '#fff', textTransform: 'none', justifyContent: 'flex-start', py: 1 }}
              >
                Se connecter
              </Button>
              <Button 
                fullWidth 
                variant="contained" 
                onClick={() => { setOpenDemande(true); setMobileMenuOpen(false); }}
                sx={{ bgcolor: colors.gold, color: colors.navy, textTransform: 'none', fontWeight: 800 }}
              >
                Créer un compte
              </Button>
            </Stack>
          )}
        </Container>
      </AppBar>

      {/* HERO SECTION */}
      <Box sx={{ pt: { xs: 12, sm: 15, md: 22 }, pb: { xs: 5, sm: 8, md: 10 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={isMobile ? 4 : 8} alignItems="center">
            <Grid item xs={12} md={7}>
              <Fade in timeout={1000}>
                <Box>
                  <Chip 
                    label={isMobile ? "Conformité ANSI & eIDAS" : "Conformité ANSI (Tunisie) & eIDAS (Europe)"} 
                    sx={{ 
                      color: colors.gold, 
                      borderColor: colors.gold, 
                      mb: isMobile ? 2 : 3, 
                      fontWeight: 700, 
                      px: 1,
                      fontSize: isMobile ? '0.65rem' : '0.875rem',
                      height: isMobile ? 24 : 32
                    }} 
                    variant="outlined" 
                  />
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontWeight: 950, 
                      mb: isMobile ? 2 : 3, 
                      fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3.5rem' }, 
                      lineHeight: 1.2
                    }}
                  >
                    Bâtir la <span style={{ color: colors.gold }}>Confiance Numérique</span> avec Protected Consulting.
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#94a3b8', 
                      mb: isMobile ? 3 : 5, 
                      fontSize: isMobile ? '0.9rem' : '1.1rem', 
                      maxWidth: isMobile ? '100%' : '90%' 
                    }}
                  >
                    Leader en Tunisie avec plus de 22 ans d'expertise. Notre plateforme garantit l'intégrité, l'authenticité et la non-répudiation de vos échanges électroniques.
                  </Typography>
                  
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={isMobile ? 1.5 : 2}>
                    <Button 
                      variant="contained" 
                      size={isMobile ? "medium" : "large"} 
                      onClick={() => setOpenDemande(true)} 
                      sx={{ 
                        bgcolor: colors.gold, 
                        color: colors.navy, 
                        px: isMobile ? 3 : 5, 
                        py: isMobile ? 1.5 : 2, 
                        fontWeight: 900, 
                        borderRadius: '12px',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      Démarrer un projet
                    </Button>
                    <Button 
                      variant="outlined" 
                      size={isMobile ? "medium" : "large"} 
                      sx={{ 
                        color: '#fff', 
                        borderColor: 'rgba(255,255,255,0.3)', 
                        px: isMobile ? 3 : 4, 
                        borderRadius: '12px',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }} 
                      startIcon={!isSmallMobile && <TerminalIcon />}
                    >
                      {isMobile ? "Audit ISO" : "Audit ISO 27001"}
                    </Button>
                  </Stack>
                </Box>
              </Fade>
            </Grid>

            {!isMobile && (
              <Grid item xs={12} md={5}>
                <Fade in timeout={1500}>
                  <Paper elevation={24} sx={{ p: 4, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                    <Stack spacing={3}>
                      <FeatureItem icon={<VerifiedUserIcon sx={{color: colors.gold}} />} title="Infrastructure PKI" desc="Émission de certificats X.509 sécurisés par HSM." isMobile={isMobile} />
                      <FeatureItem icon={<DrawIcon sx={{color: colors.gold}} />} title="Valeur Juridique" desc="Conformité stricte à la Loi 2000-83 et au règlement eIDAS." isMobile={isMobile} />
                      <FeatureItem icon={<ShieldIcon sx={{color: colors.gold}} />} title="Security by Design" desc="Architecture microservices résiliente sous Spring Boot." isMobile={isMobile} />
                    </Stack>
                  </Paper>
                </Fade>
              </Grid>
            )}
          </Grid>

          {/* Version mobile des features */}
          {isMobile && (
            <Box sx={{ mt: 4 }}>
              <Stack spacing={2}>
                <FeatureItem icon={<VerifiedUserIcon sx={{color: colors.gold}} />} title="Infrastructure PKI" desc="Émission de certificats X.509 sécurisés par HSM." isMobile={isMobile} />
                <FeatureItem icon={<DrawIcon sx={{color: colors.gold}} />} title="Valeur Juridique" desc="Conformité stricte à la Loi 2000-83 et au règlement eIDAS." isMobile={isMobile} />
                <FeatureItem icon={<ShieldIcon sx={{color: colors.gold}} />} title="Security by Design" desc="Architecture microservices résiliente sous Spring Boot." isMobile={isMobile} />
              </Stack>
            </Box>
          )}
        </Container>
      </Box>

      {/* SECTION WORKFLOW */}
      <Box sx={{ py: { xs: 5, sm: 8, md: 10 }, bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Container maxWidth="lg">
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            textAlign="center" 
            fontWeight={900} 
            sx={{ mb: { xs: 4, sm: 6, md: 8 }, fontSize: isMobile ? '1.5rem' : '2.125rem' }}
          >
            Le Flux de <span style={{ color: colors.gold }}>Signature Sécurisée</span>
          </Typography>
          
          {!isMobile && !isTablet && renderDesktopStepper()}
          {isTablet && !isMobile && renderTabletStepper()}
          {isMobile && renderMobileStepper()}
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <Container maxWidth="lg">
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            © 2024 Protected Consulting - Tous droits réservés
          </Typography>
        </Container>
      </Box>

      {/* MODALES & NOTIFICATIONS */}
      <Dialog 
        open={openConnexion} 
        onClose={() => setOpenConnexion(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            bgcolor: 'transparent', 
            boxShadow: 'none',
            margin: isMobile ? '16px' : '32px',
            width: isMobile ? 'calc(100% - 32px)' : 'auto'
          } 
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton 
            onClick={() => setOpenConnexion(false)} 
            sx={{ 
              position: 'absolute', 
              right: isMobile ? 10 : 20, 
              top: isMobile ? 10 : 20, 
              zIndex: 10, 
              color: '#64748b',
              bgcolor: 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
            }}
          >
            <CloseIcon fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
          <Connexion onSwitch={() => { setOpenConnexion(false); setOpenDemande(true); }} />
        </DialogContent>
      </Dialog>

      <Dialog 
        open={openDemande} 
        onClose={() => setOpenDemande(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ 
          sx: { 
            bgcolor: 'transparent', 
            boxShadow: 'none',
            margin: isMobile ? '16px' : '32px',
            width: isMobile ? 'calc(100% - 32px)' : 'auto'
          } 
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton 
            onClick={() => setOpenDemande(false)} 
            sx={{ 
              position: 'absolute', 
              right: isMobile ? 10 : 20, 
              top: isMobile ? 10 : 20, 
              zIndex: 10, 
              color: '#64748b',
              bgcolor: 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
            }}
          >
            <CloseIcon fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
          <DemandeInscription onSwitch={() => { setOpenDemande(false); setOpenConnexion(true); }} />
        </DialogContent>
      </Dialog>

      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={() => setNotification({ ...notification, open: false })} 
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: 70, sm: 80 } }}
      >
        <Alert severity={notification.type} variant="filled" sx={{ borderRadius: '12px' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const FeatureItem = ({ icon, title, desc, isMobile }) => (
  <Stack direction="row" spacing={isMobile ? 1.5 : 2} alignItems="flex-start">
    <Avatar sx={{ bgcolor: 'rgba(255, 193, 7, 0.1)', width: isMobile ? 40 : 48, height: isMobile ? 40 : 48 }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant={isMobile ? "body2" : "subtitle1"} fontWeight={800} color="#fff">
        {title}
      </Typography>
      <Typography variant="body2" color="#94a3b8" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
        {desc}
      </Typography>
    </Box>
  </Stack>
);

export default Home;