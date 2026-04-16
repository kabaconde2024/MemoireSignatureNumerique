import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, Button, Grid, Alert, InputAdornment, 
  CircularProgress, Typography, Fade, FormHelperText
} from '@mui/material';
import { Lock, Phone, CheckCircleOutline, ArrowForward, Mail, Person, ErrorOutline } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../../services/api';

const Inscription = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    motDePasse: '', 
    confirmMotDePasse: '',
    nom: '', 
    prenom: '', 
    telephone: '' 
  });
  const [errors, setErrors] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    motDePasse: '',
    confirmMotDePasse: ''
  });
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

  // ============================================
  // VALIDATIONS STANDARDS
  // ============================================

  /**
   * Validation du nom (lettres, espaces, tirets, apostrophes uniquement)
   */
  const validateNom = (nom) => {
    if (!nom || nom.trim() === '') {
      return "Le nom est requis";
    }
    if (nom.length < 2) {
      return "Le nom doit contenir au moins 2 caractères";
    }
    if (nom.length > 50) {
      return "Le nom ne peut pas dépasser 50 caractères";
    }
    const nomRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s\-']+$/;
    if (!nomRegex.test(nom)) {
      return "Le nom ne peut contenir que des lettres, espaces, tirets ou apostrophes";
    }
    return "";
  };

  /**
   * Validation du prénom (lettres, espaces, tirets, apostrophes uniquement)
   */
  const validatePrenom = (prenom) => {
    if (!prenom || prenom.trim() === '') {
      return "Le prénom est requis";
    }
    if (prenom.length < 2) {
      return "Le prénom doit contenir au moins 2 caractères";
    }
    if (prenom.length > 50) {
      return "Le prénom ne peut pas dépasser 50 caractères";
    }
    const prenomRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s\-']+$/;
    if (!prenomRegex.test(prenom)) {
      return "Le prénom ne peut contenir que des lettres, espaces, tirets ou apostrophes";
    }
    return "";
  };

  /**
   * Validation du téléphone (format international)
   * Accepte: +221XXXXXXXXX, 00221XXXXXXXXX, 0XXXXXXXXX
   */
  const validateTelephone = (telephone) => {
    if (!telephone || telephone.trim() === '') {
      return "Le numéro de téléphone est requis";
    }
    
    // Nettoyer le numéro (enlever espaces, tirets, points)
    const cleaned = telephone.replace(/[\s\-\.\(\)]/g, '');
    
    // Format international: +221XXXXXXXXX (Sénégal)
    const internationalRegex = /^\+(221|33|223|224|225|226|227|228|229)[0-9]{9}$/;
    // Format avec double zéro: 00221XXXXXXXXX
    const doubleZeroRegex = /^00(221|33|223|224|225|226|227|228|229)[0-9]{9}$/;
    // Format local (Afrique de l'Ouest): 0XXXXXXXXX
    const localRegex = /^0[67][0-9]{8}$/;
    
    if (!internationalRegex.test(cleaned) && !doubleZeroRegex.test(cleaned) && !localRegex.test(cleaned)) {
      return "Numéro de téléphone invalide. Utilisez le format +221XXXXXXXXX ou 0XXXXXXXXX";
    }
    
    return "";
  };

  /**
   * Validation du mot de passe (standard OWASP)
   * - Minimum 12 caractères
   * - Au moins 1 majuscule
   * - Au moins 1 minuscule
   * - Au moins 1 chiffre
   * - Au moins 1 caractère spécial
   */
  const validateMotDePasse = (motDePasse) => {
    if (!motDePasse) {
      return "Le mot de passe est requis";
    }
    if (motDePasse.length < 12) {
      return "Le mot de passe doit contenir au moins 12 caractères";
    }
    if (motDePasse.length > 128) {
      return "Le mot de passe ne peut pas dépasser 128 caractères";
    }
    
    const hasUpperCase = /[A-Z]/.test(motDePasse);
    const hasLowerCase = /[a-z]/.test(motDePasse);
    const hasNumber = /[0-9]/.test(motDePasse);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(motDePasse);
    
    if (!hasUpperCase) {
      return "Le mot de passe doit contenir au moins une lettre majuscule";
    }
    if (!hasLowerCase) {
      return "Le mot de passe doit contenir au moins une lettre minuscule";
    }
    if (!hasNumber) {
      return "Le mot de passe doit contenir au moins un chiffre";
    }
    if (!hasSpecialChar) {
      return "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&* etc.)";
    }
    
    // Éviter les mots de passe trop simples
    const commonPasswords = ['Password123!', 'Admin123!', 'User123!', 'Welcome123!'];
    if (commonPasswords.includes(motDePasse)) {
      return "Ce mot de passe est trop commun. Veuillez en choisir un plus sécurisé";
    }
    
    return "";
  };

  /**
   * Validation de la confirmation du mot de passe
   */
  const validateConfirmMotDePasse = (confirmMotDePasse, motDePasse) => {
    if (!confirmMotDePasse) {
      return "Veuillez confirmer votre mot de passe";
    }
    if (confirmMotDePasse !== motDePasse) {
      return "Les mots de passe ne correspondent pas";
    }
    return "";
  };

  // Mise à jour des erreurs en temps réel
  useEffect(() => {
    setErrors(prev => ({
      ...prev,
      nom: validateNom(formData.nom),
      prenom: validatePrenom(formData.prenom),
      telephone: validateTelephone(formData.telephone),
      motDePasse: validateMotDePasse(formData.motDePasse),
      confirmMotDePasse: validateConfirmMotDePasse(formData.confirmMotDePasse, formData.motDePasse)
    }));
  }, [formData.nom, formData.prenom, formData.telephone, formData.motDePasse, formData.confirmMotDePasse]);

  // Vérifier si le formulaire est valide
  const isFormValid = () => {
    return formData.nom && formData.prenom && formData.telephone && 
           formData.motDePasse && formData.confirmMotDePasse &&
           !errors.nom && !errors.prenom && !errors.telephone && 
           !errors.motDePasse && !errors.confirmMotDePasse;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation finale avant soumission
    const nomError = validateNom(formData.nom);
    const prenomError = validatePrenom(formData.prenom);
    const telephoneError = validateTelephone(formData.telephone);
    const motDePasseError = validateMotDePasse(formData.motDePasse);
    const confirmError = validateConfirmMotDePasse(formData.confirmMotDePasse, formData.motDePasse);
    
    if (nomError || prenomError || telephoneError || motDePasseError || confirmError) {
      setErrors({
        nom: nomError,
        prenom: prenomError,
        telephone: telephoneError,
        motDePasse: motDePasseError,
        confirmMotDePasse: confirmError
      });
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      const token = new URLSearchParams(location.search).get('token');
      await API.post('/auth/finaliser-inscription', { 
        ...formData, 
        token, 
        role: 'UTILISATEUR' 
      });
      setIsCompleted(true);
    } catch (error) {
      setErrorMsg(error.response?.data?.erreur || "Impossible d'activer le compte.");
    } finally { 
      setLoading(false); 
    }
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
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Prénom" 
              required 
              value={formData.prenom} 
              onChange={(e) => setFormData({...formData, prenom: e.target.value})}
              error={!!errors.prenom}
              helperText={errors.prenom}
              InputProps={{ 
                sx: { borderRadius: '12px' },
                startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 20 }}/></InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Nom" 
              required 
              value={formData.nom} 
              onChange={(e) => setFormData({...formData, nom: e.target.value})}
              error={!!errors.nom}
              helperText={errors.nom}
              InputProps={{ 
                sx: { borderRadius: '12px' },
                startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 20 }}/></InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="Téléphone" 
              required 
              value={formData.telephone} 
              onChange={(e) => setFormData({...formData, telephone: e.target.value})}
              error={!!errors.telephone}
              helperText={errors.telephone || "Exemple: +221771234567 ou 0771234567"}
              InputProps={{ 
                sx: { borderRadius: '12px' }, 
                startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 20 }}/></InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="Mot de passe" 
              type="password" 
              required 
              value={formData.motDePasse} 
              onChange={(e) => setFormData({...formData, motDePasse: e.target.value})}
              error={!!errors.motDePasse}
              helperText={errors.motDePasse || "12+ caractères, majuscule, minuscule, chiffre, caractère spécial"}
              InputProps={{ 
                sx: { borderRadius: '12px' }, 
                startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 20 }}/></InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="Confirmer le mot de passe" 
              type="password" 
              required 
              value={formData.confirmMotDePasse} 
              onChange={(e) => setFormData({...formData, confirmMotDePasse: e.target.value})}
              error={!!errors.confirmMotDePasse}
              helperText={errors.confirmMotDePasse}
              InputProps={{ 
                sx: { borderRadius: '12px' }, 
                startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 20 }}/></InputAdornment>
              }}
            />
          </Grid>
        </Grid>

        <Button 
          fullWidth variant="contained" type="submit" disabled={loading || !isFormValid()} 
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