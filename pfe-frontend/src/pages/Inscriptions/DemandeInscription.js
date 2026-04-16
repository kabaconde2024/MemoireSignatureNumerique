import React, { useState } from 'react';
import { 
  Box, TextField, Button, Alert, InputAdornment, 
  CircularProgress, Typography, Paper
} from '@mui/material';
import { Email, Send, CheckCircleOutline, ErrorOutline } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';

const DemandeInscription = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [isSent, setIsSent] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const redirectPath = query.get('redirect');

  // ============================================
  // VALIDATION EMAIL SELON RFC 5322
  // ============================================
  
  /**
   * Valide un email selon les règles RFC 5322
   * Règles:
   * - La partie locale (avant @) max 64 caractères
   * - Le domaine (après @) max 255 caractères
   * - Caractères autorisés dans partie locale: lettres, chiffres, ., _, -, +
   * - Pas de points consécutifs dans partie locale
   * - Pas de point au début ou fin de partie locale
   * - Domaine valide avec TLD d'au moins 2 caractères
   */
  const validateEmailRFC5322 = (email) => {
    // Trim et nettoyage
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      return { isValid: false, error: "L'adresse email est requise" };
    }

    // Vérification du format basique (présence de @)
    const atIndex = trimmedEmail.indexOf('@');
    if (atIndex === -1) {
      return { isValid: false, error: "Format d'email invalide (il manque @)" };
    }

    // Séparation local-part et domaine
    const localPart = trimmedEmail.substring(0, atIndex);
    const domain = trimmedEmail.substring(atIndex + 1);

    // === Vérification de la partie locale (avant @) ===
    if (localPart.length === 0) {
      return { isValid: false, error: "La partie avant @ ne peut pas être vide" };
    }
    
    if (localPart.length > 64) {
      return { isValid: false, error: "La partie avant @ ne peut pas dépasser 64 caractères" };
    }

    // Vérifier les caractères autorisés dans la partie locale
    const localPartRegex = /^[a-zA-Z0-9][a-zA-Z0-9._+%-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    if (!localPartRegex.test(localPart)) {
      return { 
        isValid: false, 
        error: "Caractères non autorisés dans l'email. Utilisez lettres, chiffres, points, tirets, underscore" 
      };
    }

    // Pas de points consécutifs dans la partie locale
    if (localPart.includes('..')) {
      return { isValid: false, error: "Points consécutifs non autorisés dans l'email" };
    }

    // === Vérification du domaine (après @) ===
    if (domain.length === 0) {
      return { isValid: false, error: "Le domaine ne peut pas être vide" };
    }

    if (domain.length > 255) {
      return { isValid: false, error: "Le domaine ne peut pas dépasser 255 caractères" };
    }

    // Vérifier que le domaine contient au moins un point
    if (domain.indexOf('.') === -1) {
      return { isValid: false, error: "Domaine invalide (ex: example.com)" };
    }

    // Vérifier que le domaine ne commence ou finit pas par un point ou tiret
    if (domain.startsWith('.') || domain.startsWith('-') || domain.endsWith('.') || domain.endsWith('-')) {
      return { isValid: false, error: "Format de domaine invalide" };
    }

    // Vérifier les caractères autorisés dans le domaine
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/;
    if (!domainRegex.test(domain.split('.')[0])) {
      return { isValid: false, error: "Format de domaine invalide" };
    }

    // Vérifier le TLD (dernière partie après le dernier point)
    const lastDotIndex = domain.lastIndexOf('.');
    const tld = domain.substring(lastDotIndex + 1);
    
    if (tld.length < 2) {
      return { isValid: false, error: "Extension de domaine trop courte (ex: .com, .fr)" };
    }
    
    if (tld.length > 6) {
      return { isValid: false, error: "Extension de domaine invalide" };
    }

    // Vérifier que le TLD contient uniquement des lettres
    const tldRegex = /^[a-zA-Z]+$/;
    if (!tldRegex.test(tld)) {
      return { isValid: false, error: "Extension de domaine invalide (lettres uniquement)" };
    }

    // Vérification des sous-domaines (pas de points consécutifs)
    if (domain.includes('..')) {
      return { isValid: false, error: "Format de domaine invalide (points consécutifs)" };
    }

    return { isValid: true, error: null };
  };

  // Liste des TLD valides (non exhaustive - peut être étendue)
  const validTLDs = [
    'com', 'fr', 'org', 'net', 'edu', 'gov', 'io', 'co', 'uk', 'de', 'jp', 'cn',
    'au', 'ca', 'ch', 'es', 'it', 'nl', 'pl', 'ru', 'se', 'br', 'in', 'mx',
    'eu', 'info', 'biz', 'name', 'pro', 'tel', 'tv', 'cc', 'me', 'so', 'app',
    'dev', 'cloud', 'tech', 'online', 'shop', 'store', 'blog', 'xyz', 'club'
  ];

  // Validation plus stricte avec liste blanche de TLD (optionnel)
  const validateEmailStrict = (email) => {
    const basicValidation = validateEmailRFC5322(email);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Vérification supplémentaire du TLD avec liste blanche
    const trimmedEmail = email.trim().toLowerCase();
    const atIndex = trimmedEmail.indexOf('@');
    const domain = trimmedEmail.substring(atIndex + 1);
    const lastDotIndex = domain.lastIndexOf('.');
    const tld = domain.substring(lastDotIndex + 1);

    if (!validTLDs.includes(tld)) {
      return { 
        isValid: false, 
        error: `Extension '${tld}' non reconnue. Utilisez une extension standard (.com, .fr, .org, etc.)` 
      };
    }

    return { isValid: true, error: null };
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Validation en temps réel
    if (newEmail) {
      const result = validateEmailRFC5322(newEmail);
      setEmailError(result.error);
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation avant envoi
    const validation = validateEmailStrict(email);
    if (!validation.isValid) {
      setStatus({ 
        type: 'error', 
        msg: validation.error 
      });
      return;
    }

    setLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      await API.post('/auth/demande-inscription', { 
        email: email.trim().toLowerCase(),
        redirectPath: redirectPath
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
      "& fieldset": { borderColor: emailError ? '#f44336' : 'rgba(0, 0, 0, 0.2)' },
      "&:hover fieldset": { borderColor: '#000' },
      "&.Mui-focused fieldset": { borderColor: emailError ? '#f44336' : '#3b82f6' }
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
          <Alert 
            severity={status.type} 
            sx={{ mb: 3 }} 
            onClose={() => setStatus({type:'', msg:''})}
            icon={<ErrorOutline />}
          >
            {status.msg}
          </Alert>
        )}

        <TextField 
          fullWidth 
          label="Votre adresse Email" 
          type="email" 
          required 
          value={email}
          onChange={handleEmailChange}
          error={!!emailError}
          helperText={emailError || "Exemple: jean.dupont@entreprise.com"}
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
          disabled={loading || !email || !!emailError}
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