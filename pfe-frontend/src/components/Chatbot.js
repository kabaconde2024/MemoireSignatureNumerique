// components/Chatbot.js
import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Paper, TextField, IconButton, Typography,
    Stack, Avatar, CircularProgress, Chip,
    Drawer, Fab, Badge
} from '@mui/material';
import {
    Send as SendIcon,
    Chat as ChatIcon,
    Close as CloseIcon,
    SmartToy as BotIcon,
    Person as PersonIcon
} from '@mui/icons-material';

// Configuration de l'API du service IA
const IA_API_URL = process.env.REACT_APP_IA_API_URL || 'https://trustsign-ia-service-v2.onrender.com';

// Fonction pour les requêtes API
const fetchAPI = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
};

const Chatbot = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Message d'accueil
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 1,
                    text: "👋 Bonjour ! Je suis l'assistant virtuel de TrustSign.\n\nJe peux vous aider avec :\n• La signature électronique\n• Les certificats numériques\n• Les invitations à signer\n• La sécurité de votre compte\n\nComment puis-je vous aider aujourd'hui ?",
                    sender: 'bot',
                    timestamp: new Date()
                }
            ]);
        }
    }, []);

    // Charger les suggestions depuis le service IA
    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const data = await fetchAPI(`${IA_API_URL}/api/chatbot/suggestions`);
                setSuggestions(data.suggestions);
            } catch (error) {
                console.error('Erreur chargement suggestions:', error);
                // Suggestions par défaut en cas d'erreur
                setSuggestions([
                    "Comment signer un document ?",
                    "Comment obtenir un certificat ?",
                    "Comment inviter à signer ?",
                    "Activer la double authentification"
                ]);
            }
        };
        fetchSuggestions();
    }, []);

    // Scroll automatique vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Envoyer un message
    const sendMessage = async (text) => {
        if (!text.trim()) return;

        // Ajouter le message utilisateur
        const userMessage = {
            id: Date.now(),
            text: text,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Récupérer le rôle de l'utilisateur depuis le localStorage
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            
            // Appel au service IA déployé sur Render
            const response = await fetch(`${IA_API_URL}/api/chatbot/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    user_email: user?.email,
                    user_role: user?.role
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();

            // Ajouter la réponse du bot
            const botMessage = {
                id: Date.now() + 1,
                text: data.response,
                sender: 'bot',
                suggestions: data.suggestions,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error('Erreur chatbot:', error);
            
            // Message d'erreur avec fallback
            let errorText = "❌ Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.";
            
            if (error.message?.includes('503')) {
                errorText = "🔧 Le service de chat est temporairement indisponible. Veuillez réessayer plus tard ou contacter le support à support@trustsign.com.";
            } else if (error.message?.includes('401') || error.message?.includes('403')) {
                errorText = "🔐 Session expirée. Veuillez vous reconnecter pour utiliser le chat.";
            }
            
            const errorMessage = {
                id: Date.now() + 1,
                text: errorText,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {/* Bouton flottant */}
            <Fab
                color="primary"
                aria-label="chat"
                onClick={() => setOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    bgcolor: '#1a237e',
                    '&:hover': { bgcolor: '#0d47a1' },
                    zIndex: 1000
                }}
            >
                <Badge color="error" variant="dot" invisible={messages.length === 1}>
                    <ChatIcon />
                </Badge>
            </Fab>

            {/* Fenêtre de chat */}
            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 450 },
                        height: { xs: '100%', sm: '80%' },
                        maxHeight: { sm: 700 },
                        top: { sm: 'auto' },
                        bottom: 0,
                        borderRadius: { sm: '16px 16px 0 0' },
                        zIndex: 1200
                    }
                }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* En-tête */}
                    <Paper sx={{ p: 2, bgcolor: '#1a237e', color: 'white', borderRadius: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <BotIcon />
                                <Typography variant="h6" fontWeight="bold">
                                    Assistant TrustSign
                                </Typography>
                                <Chip 
                                    label="En ligne" 
                                    size="small" 
                                    sx={{ bgcolor: '#4caf50', color: 'white', ml: 1 }}
                                />
                            </Stack>
                            <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            Je réponds à vos questions sur la signature électronique
                        </Typography>
                    </Paper>

                    {/* Messages */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
                        {messages.map((message) => (
                            <Stack
                                key={message.id}
                                direction="row"
                                justifyContent={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                                spacing={1}
                                sx={{ mb: 2 }}
                            >
                                {message.sender === 'bot' && (
                                    <Avatar sx={{ bgcolor: '#1a237e', width: 32, height: 32 }}>
                                        <BotIcon sx={{ fontSize: 18 }} />
                                    </Avatar>
                                )}
                                <Paper
                                    sx={{
                                        p: 1.5,
                                        maxWidth: '80%',
                                        bgcolor: message.sender === 'user' ? '#1a237e' : 'white',
                                        color: message.sender === 'user' ? 'white' : 'inherit',
                                        borderRadius: 2
                                    }}
                                >
                                    <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                        {message.text}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5 }}>
                                        {formatTime(message.timestamp)}
                                    </Typography>
                                </Paper>
                                {message.sender === 'user' && (
                                    <Avatar sx={{ bgcolor: '#ff9800', width: 32, height: 32 }}>
                                        <PersonIcon sx={{ fontSize: 18 }} />
                                    </Avatar>
                                )}
                            </Stack>
                        ))}
                        
                        {loading && (
                            <Stack direction="row" justifyContent="flex-start" spacing={1} sx={{ mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#1a237e', width: 32, height: 32 }}>
                                    <BotIcon sx={{ fontSize: 18 }} />
                                </Avatar>
                                <Paper sx={{ p: 1.5, bgcolor: 'white' }}>
                                    <CircularProgress size={20} />
                                </Paper>
                            </Stack>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Suggestions rapides */}
                    {suggestions.length > 0 && messages.length < 3 && (
                        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
                            <Typography variant="caption" color="textSecondary" gutterBottom>
                                Suggestions :
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                                {suggestions.slice(0, 4).map((suggestion, idx) => (
                                    <Chip
                                        key={idx}
                                        label={suggestion}
                                        onClick={() => sendMessage(suggestion)}
                                        sx={{ cursor: 'pointer' }}
                                        size="small"
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* Input */}
                    <Paper sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                        <Stack direction="row" spacing={1}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Posez votre question..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                inputRef={inputRef}
                                multiline
                                maxRows={3}
                            />
                            <IconButton 
                                color="primary" 
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || loading}
                            >
                                <SendIcon />
                            </IconButton>
                        </Stack>
                    </Paper>
                </Box>
            </Drawer>
        </>
    );
};

export default Chatbot;