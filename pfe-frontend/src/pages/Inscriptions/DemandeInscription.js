import React, { useState } from 'react';
import { 
  Box, TextField, Button, Alert, InputAdornment, 
  CircularProgress, Typography, Paper
} from '@mui/material';
import { Email, Send, CheckCircleOutline } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';

const DemandeInscription = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [isSent, setIsSent] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const redirectPath = query.get('redirect');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      // L'endpoint doit correspondre à votre logique Backend (ex: /auth/request-signup)
      await API.post('/auth/demande-inscription', { 
        email: email.trim().toLowerCase(),
        redirectPath: redirectPath // Optionnel: pour que le lien final sache où revenir
      });
      
      setIsSent(true);
    } catch (error) {
      setStatus({ 
        type: 'error', 
        msg: error.response?.data?.erreur || "Une erreur est survenue. Veuillez réessayer." 
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    input: { color: '#000' },
    label: { color: '#000', fontWeight: 600 },
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: 'rgba(0, 0, 0, 0.2)' },
      "&:hover fieldset": { borderColor: '#000' },
      "&.Mui-focused fieldset": { borderColor: '#3b82f6' }
    }
  };

  if (isSent) {
    return (
      <Paper elevation={3} sx={{ p: 4, bgcolor: 'white', borderRadius: 6, textAlign: 'center' }}>
        <CheckCircleOutline sx={{ fontSize: 70, color: '#4caf50', mb: 2 }} />
        <Typography variant="h5" fontWeight="900" gutterBottom>
          LIEN ENVOYÉ !
        </Typography>
        <Typography variant="body1" sx={{ color: '#555', mb: 3 }}>
          Un lien sécurisé a été envoyé à <strong>{email}</strong>. 
          Veuillez cliquer sur ce lien pour compléter votre inscription.
        </Typography>
        <Button 
          fullWidth 
          variant="outlined" 
          onClick={() => navigate('/')}
          sx={{ color: '#000', borderColor: '#000', fontWeight: '700' }}
        >
          Retour à l'accueil
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, bgcolor: 'rgba(255, 255, 255, 0.95)', borderRadius: 6 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="900" sx={{ color: '#000', mb: 1 }}>
          INSCRIPTION
        </Typography>
        <Typography variant="body2" sx={{ color: '#555', mb: 2 }}>
          Entrez votre email pour recevoir votre invitation d'inscription sécurisée.
        </Typography>
        <Box sx={{ width: 60, height: 4, bgcolor: '#3b82f6', mx: 'auto', borderRadius: 2 }} />
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        {status.msg && (
          <Alert severity={status.type} sx={{ mb: 3 }} onClose={() => setStatus({type:'', msg:''})}>
            {status.msg}
          </Alert>
        )}

        <TextField 
          fullWidth 
          label="Votre adresse Email" 
          type="email" 
          required 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={fieldStyle} 
          InputProps={{ 
            startAdornment: <InputAdornment position="start"><Email /></InputAdornment> 
          }}
          placeholder="exemple@email.com"
        />

        <Button 
          fullWidth 
          variant="contained" 
          type="submit" 
          disabled={loading || !email}
          sx={{ 
            mt: 4, py: 2, bgcolor: '#000', fontWeight: '900', 
            '&:hover': { bgcolor: '#222' }, '&:disabled': { bgcolor: '#666' }
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "RECEVOIR LE LIEN D'INSCRIPTION"
          )}
        </Button>
      </Box>

      <Button 
        fullWidth 
        onClick={() => navigate('/')} 
        sx={{ 
          mt: 2, color: '#000', fontWeight: 700, opacity: 0.7,
          '&:hover': { opacity: 1, backgroundColor: 'transparent' }
        }}
      >
        Déjà membre ? Se connecter
      </Button>
    </Paper>
  );
};

export default DemandeInscription;