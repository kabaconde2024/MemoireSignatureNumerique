// App.js - Version corrigée avec les deux routes
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Mécanismes de sécurité et Layouts
import PrivateRoute from './components/PrivateRoute';
import AuthLayout from './components/AuthLayout';

// Pages
import Home from './pages/Home';
import Connexion from './pages/Connexion/Connexion';
import DemandeInscription from './pages/Inscriptions/DemandeInscription';
import Inscription from './pages/Inscriptions/Inscription';
import MotDePasseOublie from './pages/MotPasse/MotDePasseOublie';
import UserDashboard from './pages/UserDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SignatureSimplePage from './pages/Simple/SignatureSimplePage';
import SignaturePkiPage from './pages/Pki/SignaturePkiPage';



const theme = createTheme({
  palette: {
    primary: { main: '#1E293B' },
    secondary: { main: '#2563EB' },
    background: { default: '#F8FAFC' }
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif', h4: { fontWeight: 800 }, h5: { fontWeight: 700 } },
  shape: { borderRadius: 8 }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/connexion" element={<AuthLayout title="Connexion"><Connexion /></AuthLayout>} />
          <Route path="/inscription" element={<AuthLayout title="Créer un compte"><DemandeInscription /></AuthLayout>} />
          <Route path="/finaliser-inscription" element={<AuthLayout title="Compléter mon profil"><Inscription /></AuthLayout>} />
          <Route path="/mot-de-passe-oublie" element={<AuthLayout title="Mot de passe oublié"><MotDePasseOublie /></AuthLayout>} />
          
          {/* ✅ Route pour signature simple */}
          <Route path="/signature-simple/:token" element={<SignatureSimplePage />} />
          
          {/* ✅ Route pour signature PKI */}
          <Route path="/signature-pki/:token" element={<SignaturePkiPage />} />

          <Route path="/super-admin-dashboard" element={<PrivateRoute allowedRoles={['SUPER_ADMIN']}><SuperAdminDashboard /></PrivateRoute>} />
          <Route path="/user-dashboard" element={<PrivateRoute allowedRoles={['UTILISATEUR', 'EMPLOYE', 'ADMIN_ENTREPRISE', 'SUPER_ADMIN']}><UserDashboard /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;