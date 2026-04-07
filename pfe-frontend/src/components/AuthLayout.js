import React from 'react';
import { Box, Container, Paper, Typography, Fade } from '@mui/material';
import { VerifiedUser } from '@mui/icons-material';

const AuthLayout = ({ children, title }) => {
    return (
        <Box sx={{ 
            minHeight: '100vh', display: 'flex', alignItems: 'center', 
            background: 'linear-gradient(135deg, #FDFDFD 0%, #F0F4F8 100%)',
            py: 8, position: 'relative'
        }}>
            <Container maxWidth="xs">
                <Box sx={{ textAlign: 'center', mb: 5 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <VerifiedUser sx={{ color: '#2563EB', fontSize: 42 }} />
                        <Typography variant="h4" sx={{ 
                            fontWeight: 900, color: '#1E293B', letterSpacing: '-1.5px',
                            background: 'linear-gradient(45deg, #1E293B 30%, #2563EB 90%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            CONSULTING <span style={{ fontWeight: 500 }}>PROTECTED</span>
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Trusted Risk Management Platform
                    </Typography>
                </Box>

                <Fade in timeout={800}>
                    <Paper elevation={0} sx={{ 
                        p: 5, borderRadius: '32px', bgcolor: '#FFFFFF',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)'
                    }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 4, color: '#0F172A', textAlign: 'center', letterSpacing: '-0.5px' }}>
                            {title}
                        </Typography>
                        {children}
                    </Paper>
                </Fade>

                <Typography variant="body2" align="center" sx={{ mt: 5, color: '#CBD5E1', fontSize: '0.8rem' }}>
                    &copy; 2026 Consulting Protected. Conforme ISO 27005.
                </Typography>
            </Container>
        </Box>
    );
};

export default AuthLayout;