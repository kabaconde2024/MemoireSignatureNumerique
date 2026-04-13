import React, { useState } from 'react';
import { Box, Button, Paper, Typography, TextField, Grid, Stack, Chip, Card, CardContent, InputAdornment, useMediaQuery } from '@mui/material';
import { Draw, Security, ArrowBack, Visibility, Send } from '@mui/icons-material';

const StepConfig = ({ prevStep, onLaunchPad, onPreview, setSnackbar, addedSignataires, setAddedSignataires, isMobile = false, isTablet = false }) => {
    const [sigType, setSigType] = useState('simple');
    const [signataire, setSignataire] = useState({ email: '', telephone: '', prenom: '', nom: '' });
    const isSmallScreen = useMediaQuery('(max-width:600px)');
    const mobile = isMobile || isSmallScreen;

    const types = [
        { id: 'simple', title: 'Signature simple', desc: 'Basée sur un horodatage électronique et une double authentification', icon: <Draw sx={{ fontSize: { xs: 30, sm: 40 } }} /> },
        { id: 'pki', title: 'Signature basée sur PKI', desc: 'Utilise des certificats numériques pour une sécurité et une non-répudiation accrue', icon: <Security sx={{ fontSize: { xs: 30, sm: 40 } }} /> }
    ];

    const handleAdd = () => {
        if (signataire.email && signataire.nom && signataire.telephone && signataire.prenom) {
            setAddedSignataires([...addedSignataires, signataire]);
            setSignataire({ email: '', telephone: '', prenom: '', nom: '' });
        } else {
            setSnackbar({ open: true, message: 'Veuillez remplir les champs obligatoires.', severity: 'warning' });
        }
    };

    return (
        <Box sx={{ maxWidth: '1100px', mx: 'auto', px: { xs: 1, sm: 2 } }}>
            <Button 
                startIcon={<ArrowBack />} 
                onClick={prevStep} 
                sx={{ 
                    mb: 3, 
                    color: '#95a5a6', 
                    textTransform: 'none',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
            >
                Retour à la sélection des documents
            </Button>

            <Paper sx={{ 
                p: { xs: 2, sm: 3, md: 4 }, 
                borderRadius: '15px', 
                mb: 4, 
                border: '1px solid #E2E8F0' 
            }}>
                <Typography variant={mobile ? "subtitle1" : "h6"} fontWeight="bold" sx={{ color: '#0b1e39', mb: 3 }}>
                    Ajouter un signataire
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField 
                            fullWidth 
                            label="E-mail *" 
                            size="small" 
                            value={signataire.email} 
                            onChange={(e) => setSignataire({...signataire, email: e.target.value})}
                            sx={{ '& .MuiInputBase-root': { fontSize: { xs: '0.875rem', sm: '1rem' } } }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField 
                            fullWidth 
                            label="Numéro de téléphone *" 
                            size="small" 
                            value={signataire.telephone} 
                            onChange={(e) => setSignataire({...signataire, telephone: e.target.value})}
                            InputProps={{ startAdornment: <InputAdornment position="start">🇹🇳 +216</InputAdornment> }} 
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField 
                            fullWidth 
                            label="Prénom *" 
                            size="small" 
                            value={signataire.prenom} 
                            onChange={(e) => setSignataire({...signataire, prenom: e.target.value})} 
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField 
                            fullWidth 
                            label="Nom *" 
                            size="small" 
                            value={signataire.nom} 
                            onChange={(e) => setSignataire({...signataire, nom: e.target.value})} 
                        />
                    </Grid>
                </Grid>

                {addedSignataires.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                        {addedSignataires.map((s, idx) => (
                            <Chip 
                                key={idx} 
                                label={`${s.prenom} ${s.nom}`} 
                                onDelete={() => setAddedSignataires(addedSignataires.filter((_, i) => i !== idx))} 
                                color="primary" 
                                variant="outlined" 
                                size={mobile ? "small" : "medium"}
                            />
                        ))}
                    </Stack>
                )}

                <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
                    <Button 
                        variant="outlined" 
                        onClick={() => setSignataire({ email: '', telephone: '', prenom: '', nom: '' })}
                        size={mobile ? "small" : "medium"}
                    >
                        Vider
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleAdd} 
                        sx={{ bgcolor: '#ffc107', color: '#0b1e39', fontWeight: 'bold', '&:hover': { bgcolor: '#e6af06' } }}
                        size={mobile ? "small" : "medium"}
                    >
                        Ajouter
                    </Button>
                </Stack>
            </Paper>

            <Typography variant={mobile ? "subtitle1" : "h6"} fontWeight="bold" sx={{ color: '#0b1e39', mb: 2 }}>
                Type de signature
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {types.map((type) => (
                    <Grid item xs={12} md={6} key={type.id}>
                        <Card 
                            onClick={() => setSigType(type.id)}
                            sx={{ 
                                cursor: 'pointer', 
                                height: '100%',
                                border: sigType === type.id ? '2px solid #ffc107' : '1px solid #E2E8F0',
                                transition: '0.3s',
                                '&:hover': { boxShadow: 3 }
                            }}
                        >
                            <CardContent sx={{ textAlign: 'center', p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ color: '#ffc107', mb: 1 }}>{type.icon}</Box>
                                <Typography variant={mobile ? "body2" : "subtitle1"} fontWeight="bold">
                                    {type.title}
                                </Typography>
                                {!mobile && (
                                    <Typography variant="body2" sx={{ color: '#7f8c8d', mt: 1 }}>
                                        {type.desc}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Stack direction={mobile ? "column" : "row"} spacing={2}>
                <Button 
                    variant="outlined" 
                    fullWidth
                    startIcon={<Visibility />}
                    onClick={onPreview}
                    sx={{ 
                        py: { xs: 1, sm: 1.5 }, 
                        borderColor: '#0b1e39', 
                        color: '#0b1e39', 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                >
                    Vérifier le document
                </Button>

                <Button 
                    fullWidth 
                    variant="contained" 
                    disabled={addedSignataires.length === 0} 
                    onClick={() => onLaunchPad(addedSignataires[0], sigType)}
                    sx={{ 
                        py: { xs: 1, sm: 1.5 }, 
                        bgcolor: '#0b1e39', 
                        fontWeight: 'bold', 
                        '&:hover': { bgcolor: '#1a2e4a' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                    startIcon={<Send />}
                >
                    Envoyer l'invitation de signature
                </Button>
            </Stack>
            
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: '#7f8c8d', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                En cliquant sur envoyer, un e-mail sera adressé au signataire pour apposer sa signature.
            </Typography>
        </Box>
    );
};

export default StepConfig;