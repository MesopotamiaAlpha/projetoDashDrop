import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/theme.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SettingsPage = () => {
    const { currentUser, login } = useAuth(); // Assuming login updates currentUser with new info
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // User profile fields
    const [nomeCompleto, setNomeCompleto] = useState(currentUser?.nome_completo || '');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [perfilApresentador, setPerfilApresentador] = useState(currentUser?.perfil_apresentador || false);
    const [logoEmpresaPath, setLogoEmpresaPath] = useState(currentUser?.logo_empresa_path || '');
    const [logoFile, setLogoFile] = useState(null);
    const [modoNoturno, setModoNoturno] = useState(currentUser?.modo_noturno || false);
    
    // Acesso ao contexto de tema
    const { darkMode, setTheme } = useTheme();

    // Password change fields
    const [senhaAntiga, setSenhaAntiga] = useState('');
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmaNovaSenha, setConfirmaNovaSenha] = useState('');

    useEffect(() => {
        if (currentUser) {
            setNomeCompleto(currentUser.nome_completo || '');
            setEmail(currentUser.email || '');
            setPerfilApresentador(currentUser.perfil_apresentador || false);
            setLogoEmpresaPath(currentUser.logo_empresa_path || '');
            setModoNoturno(currentUser.modo_noturno || false);
            
            // Sincronizar o tema com a preferência do usuário
            if (currentUser.modo_noturno !== undefined) {
                setTheme(currentUser.modo_noturno);
            }
        }
    }, [currentUser, setTheme]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        const profileData = {
            nome_completo: nomeCompleto,
            email,
            perfil_apresentador: perfilApresentador,
            modo_noturno: modoNoturno
            // logo_empresa_path será tratado separadamente se um novo logo for enviado
        };
        
        // Upload do logo se um novo arquivo for selecionado
        if (logoFile) {
            try {
                const formData = new FormData();
                formData.append('logo', logoFile);
                
                const uploadResponse = await axios.post(`${API_URL}/uploads/logo`, formData, {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${localStorage.getItem('authToken')}` 
                    }
                });
                
                // Atualizar o caminho do logo nos dados do perfil
                profileData.logo_empresa_path = uploadResponse.data.filePath;
            } catch (uploadError) {
                console.error("Erro ao fazer upload do logo:", uploadError);
                setError('Falha ao fazer upload do logo. ' + (uploadError.response?.data?.message || ''));
                setLoading(false);
                return;
            }
        } else {
            // Se não houver novo arquivo, manter o caminho existente
            profileData.logo_empresa_path = logoEmpresaPath;
        }
        
        // Atualizar o tema no contexto quando o modo noturno mudar
        if (modoNoturno !== darkMode) {
            setTheme(modoNoturno);
        }

        try {
            const response = await axios.put(`${API_URL}/users/me/profile`, profileData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setSuccessMessage('Perfil atualizado com sucesso!');
            // Update currentUser in AuthContext if the backend returns the updated user
            // This depends on what login() does or if you have a setCurrentUser directly
            if (response.data.user) {
                // Hacky way to update context: re-trigger login logic or have a dedicated updateUser method in context
                // For simplicity, we're not directly updating context here, user might need to re-login or refresh to see all changes reflected globally.
                // A better way: authContext.updateUser(response.data.user);
                 // Or, if login function in context also sets user:
                 // login(currentUser.nome_usuario, /* some dummy password or handle this case */);
                 // For now, just update local state for display
                 if (currentUser && login) {
                    // Attempt to refresh user data in context by re-fetching or updating
                    // This is a common challenge with context; ensuring it stays in sync.
                    // A simple way is to re-fetch the user profile after an update.
                    const updatedUserResponse = await axios.get(`${API_URL}/users/me`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    });
                    // Manually trigger an update in the context if possible, or rely on re-login/refresh.
                    // This is a placeholder for proper context update.
                    // If useAuth provided a setCurrentUser, that would be ideal.
                    // login(currentUser.nome_usuario, ""); // This is not ideal as it requires password
                 }
            }
        } catch (err) {
            console.error("Erro ao atualizar perfil:", err.response ? err.response.data : err);
            setError(err.response?.data?.message || 'Falha ao atualizar perfil.');
        }
        setLoading(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (novaSenha !== confirmaNovaSenha) {
            setError('As novas senhas não coincidem.');
            return;
        }
        if (!novaSenha || !senhaAntiga) {
            setError('Senha antiga e nova senha são obrigatórias.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await axios.put(`${API_URL}/users/me/profile`, 
                { senha_antiga: senhaAntiga, nova_senha: novaSenha }, 
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                }
            );
            setSuccessMessage('Senha alterada com sucesso!');
            setSenhaAntiga('');
            setNovaSenha('');
            setConfirmaNovaSenha('');
        } catch (err) {
            console.error("Erro ao alterar senha:", err.response ? err.response.data : err);
            setError(err.response?.data?.message || 'Falha ao alterar senha. Verifique sua senha antiga.');
        }
        setLoading(false);
    };

    if (!currentUser) {
        return <p className="text-center text-gray-600 mt-10">Carregando dados do usuário...</p>;
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Configurações da Conta</h1>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
            {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded mb-4">{successMessage}</p>}

            {/* Profile Information Form */}
            <form onSubmit={handleProfileUpdate} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Informações do Perfil</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="nomeCompleto" className="block text-sm font-medium text-gray-700">Nome Completo:</label>
                        <input type="text" id="nomeCompleto" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email:</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                </div>
                <div className="mt-4">
                    <label htmlFor="perfilApresentador" className="flex items-center">
                        <input type="checkbox" id="perfilApresentador" checked={perfilApresentador} onChange={(e) => setPerfilApresentador(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <span className="ml-2 text-sm text-gray-700">Sou um(a) apresentador(a)</span>
                    </label>
                </div>
                <div className="mt-4">
                    <label htmlFor="logoEmpresa" className="block text-sm font-medium text-gray-700">Logo da Empresa:</label>
                    {logoEmpresaPath && <img src={logoEmpresaPath} alt="Logo Atual" className="max-h-20 my-2 border p-1"/>}
                    <input type="file" id="logoEmpresa" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    <p className="text-xs text-gray-500 mt-1">Selecione um arquivo de imagem para o logo da empresa. Este logo aparecerá no cabeçalho e na página de login.</p>
                </div>
                <div className="mt-4">
                    <label htmlFor="modoNoturno" className="block text-sm font-medium text-gray-700 mb-2">Modo Noturno:</label>
                    <label className="theme-switch">
                        <input 
                            type="checkbox" 
                            id="modoNoturno" 
                            checked={modoNoturno} 
                            onChange={(e) => setModoNoturno(e.target.checked)} 
                        />
                        <span className="slider"></span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">Ative o modo noturno para uma experiência visual mais confortável em ambientes com pouca luz.</p>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300">
                        {loading ? 'Salvando Perfil...' : 'Salvar Alterações do Perfil'}
                    </button>
                </div>
            </form>

            {/* Change Password Form */}
            <form onSubmit={handlePasswordChange} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Alterar Senha</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="senhaAntiga" className="block text-sm font-medium text-gray-700">Senha Antiga:</label>
                        <input type="password" id="senhaAntiga" value={senhaAntiga} onChange={(e) => setSenhaAntiga(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="novaSenha" className="block text-sm font-medium text-gray-700">Nova Senha:</label>
                        <input type="password" id="novaSenha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="confirmaNovaSenha" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha:</label>
                        <input type="password" id="confirmaNovaSenha" value={confirmaNovaSenha} onChange={(e) => setConfirmaNovaSenha(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-green-300">
                        {loading ? 'Alterando Senha...' : 'Alterar Senha'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;

