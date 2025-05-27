import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import '../styles/theme.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const LoginPage = () => {
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [logoEmpresa, setLogoEmpresa] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const from = location.state?.from?.pathname || "/";

    // Buscar logo da empresa para exibir na tela de login
    useEffect(() => {
        const fetchLogo = async () => {
            try {
                // Buscar o logo institucional via endpoint público
                const response = await axios.get(`${API_URL}/public/logo-institucional`);
                if (response.data && response.data.logoPath) {
                    setLogoEmpresa(response.data.logoPath);
                }
            } catch (err) {
                console.error("Erro ao buscar logo:", err);
                // Não exibir erro para o usuário, apenas não mostrar o logo
            }
        };
        
        fetchLogo();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(nomeUsuario, senha);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Falha ao fazer login. Verifique suas credenciais.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                {logoEmpresa && (
                    <div className="text-center mb-6">
                        <img 
                            src={logoEmpresa} 
                            alt="Logo da Empresa" 
                            className="login-logo"
                        />
                    </div>
                )}
                <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Login na Plataforma</h2>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nomeUsuario">
                            Nome de Usuário
                        </label>
                        <input 
                            type="text" 
                            id="nomeUsuario" 
                            value={nomeUsuario}
                            onChange={(e) => setNomeUsuario(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="senha">
                            Senha
                        </label>
                        <input 
                            type="password" 
                            id="senha" 
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:bg-blue-300"
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;

