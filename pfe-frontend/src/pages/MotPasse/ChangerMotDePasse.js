import React, { useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff, Lock } from 'lucide-react'; // Si tu as lucide-react, sinon utilise des icônes simples

const ChangerMotDePasse = ({ userId }) => {
    const [formData, setFormData] = useState({
        ancienMdp: '',
        nouveauMdp: '',
        confirmerMdp: ''
    });

    const [showPassword, setShowPassword] = useState({
        ancien: false,
        nouveau: false,
        confirmer: false
    });

    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleVisibility = (field) => {
        setShowPassword({ ...showPassword, [field]: !showPassword[field] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validation simple
        if (formData.nouveauMdp !== formData.confirmerMdp) {
            setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
            return;
        }

        try {
            // L'ID est passé dans l'URL comme dans ton Contrôleur Spring Boot
            const response = await axios.post(`https://localhost:8443/api/changer-mdp/${userId}`, {
                ancienMdp: formData.ancienMdp,
                nouveauMdp: formData.nouveauMdp
            }, { withCredentials: true });

            setMessage({ type: 'success', text: response.data.message });
            setFormData({ ancienMdp: '', nouveauMdp: '', confirmerMdp: '' });
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err.response?.data?.erreur || 'Une erreur est survenue.' 
            });
        }
    };

    // Le bouton est activé seulement si les champs sont remplis
    const isFormValid = formData.ancienMdp && formData.nouveauMdp && (formData.nouveauMdp === formData.confirmerMdp);

    return (
        <div className="max-w-xl p-6 bg-white rounded-md">
            <h2 className="text-xl font-bold text-gray-800 mb-2">*** Changer mot de passe</h2>
            <p className="text-sm text-gray-500 mb-6">
                Veuillez saisir et confirmer votre nouveau mot de passe pour sécuriser votre compte.
            </p>

            {message.text && (
                <div className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Ancien Mot de Passe */}
                <div className="relative">
                    <input
                        type={showPassword.ancien ? "text" : "password"}
                        name="ancienMdp"
                        placeholder="Ancien mot de passe*"
                        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={formData.ancienMdp}
                        onChange={handleChange}
                        required
                    />
                    <button type="button" onClick={() => toggleVisibility('ancien')} className="absolute right-3 top-3 text-gray-400">
                        {showPassword.ancien ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                {/* Nouveau Mot de Passe */}
                <div className="relative">
                    <input
                        type={showPassword.nouveau ? "text" : "password"}
                        name="nouveauMdp"
                        placeholder="Nouveau mot de passe*"
                        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={formData.nouveauMdp}
                        onChange={handleChange}
                        required
                    />
                    <button type="button" onClick={() => toggleVisibility('nouveau')} className="absolute right-3 top-3 text-gray-400">
                        {showPassword.nouveau ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                {/* Confirmer Mot de Passe */}
                <div className="relative">
                    <input
                        type={showPassword.confirmer ? "text" : "password"}
                        name="confirmerMdp"
                        placeholder="Confirmer le mot de passe*"
                        className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={formData.confirmerMdp}
                        onChange={handleChange}
                        required
                    />
                    <button type="button" onClick={() => toggleVisibility('confirmer')} className="absolute right-3 top-3 text-gray-400">
                        {showPassword.confirmer ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={!isFormValid}
                        className={`px-8 py-2 rounded font-medium transition ${
                            isFormValid 
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Confirmer
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChangerMotDePasse;