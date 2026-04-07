import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, Button, Grid, Alert, InputAdornment, 
  CircularProgress, Typography, Fade
} from '@mui/material';
import { Lock, Phone, CheckCircleOutline, ArrowForward, Mail } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';

const Inscription = () => {
  const [formData, setFormData] = useState({ email: '', motDePasse: '', nom: '', prenom: '', telephone: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const emailFromUrl = query.get('email');
    if (emailFromUrl) setFormData(prev => ({ ...prev, email: emailFromUrl }));
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const token = new URLSearchParams(location.search).get('token');
      await API.post('/auth/finaliser-inscription', { ...formData, token, role: 'UTILISATEUR' });
      setIsCompleted(true);
    } catch (error) {
      setErrorMsg(error.response?.data?.erreur || "Impossible d'activer le compte.");
    } finally { setLoading(false); }
  };

  if (isCompleted) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CheckCircleOutline sx={{ fontSize: 80, color: '#10B981', mb: 2, opacity: 0.9 }} />
        <Typography variant="h5" fontWeight="800" color="#1E293B">Bienvenue à bord !</Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mt: 2, mb: 4 }}>
            Votre compte est maintenant actif. Vous pouvez signer vos documents en toute sécurité.
        </Typography>
        <Button 
            fullWidth variant="contained" onClick={() => navigate('/')}
            sx={{ py: 1.8, borderRadius: '12px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
        >
            Accéder à mon tableau de bord
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        mb: 4, p: 2, bgcolor: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1',
        display: 'flex', alignItems: 'center', gap: 2 
      }}>
        <Mail sx={{ color: '#2563EB' }} />
        <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>{formData.email}</Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        {errorMsg && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{errorMsg}</Alert>}
        
        <Grid container spacing={2}>
          <Grid item xs={6}><TextField fullWidth label="Prénom" required value={formData.prenom} onChange={(e) => setFormData({...formData, prenom: e.target.value})} InputProps={{ sx: { borderRadius: '12px' }}}/></Grid>
          <Grid item xs={6}><TextField fullWidth label="Nom" required value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} InputProps={{ sx: { borderRadius: '12px' }}}/></Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Téléphone" required value={formData.telephone} onChange={(e) => setFormData({...formData, telephone: e.target.value})}
              InputProps={{ sx: { borderRadius: '12px' }, startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 20 }}/></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Mot de passe" type="password" required value={formData.motDePasse} onChange={(e) => setFormData({...formData, motDePasse: e.target.value})}
              InputProps={{ sx: { borderRadius: '12px' }, startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 20 }}/></InputAdornment> }}
              helperText="Utilisez un mélange de lettres, chiffres et symboles."
            />
          </Grid>
        </Grid>

        <Button 
          fullWidth variant="contained" type="submit" disabled={loading} 
          endIcon={!loading && <ArrowForward />}
          sx={{ 
            mt: 4, py: 2, borderRadius: '12px', fontWeight: 800, textTransform: 'none', fontSize: '1rem',
            bgcolor: '#2563EB', boxShadow: '0 4px 14px 0 rgba(37,99,235,0.39)',
            '&:hover': { bgcolor: '#1D4ED8', boxShadow: '0 6px 20px rgba(37,99,235,0.23)' }
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Finaliser l'inscription"}
        </Button>
      </form>
    </Box>
  );
};

export default Inscription;