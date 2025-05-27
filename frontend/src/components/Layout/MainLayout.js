import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/theme.css';

const MainLayout = ({ children }) => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to logout:", error);
            // Handle logout error (e.g., show a notification)
        }
    };

    const { darkMode } = useTheme();

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-gray-800 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        {currentUser?.logo_empresa_path && (
                            <img 
                                src={currentUser.logo_empresa_path} 
                                alt="Logo da Empresa" 
                                className="header-logo"
                            />
                        )}
                        <Link to="/" className="text-xl font-bold hover:text-gray-300">
                            ProdutoraMax
                        </Link>
                    </div>
                    <nav className="space-x-4 flex items-center">
                        <Link to="/" className="hover:text-gray-300">Dashboard</Link>
                        <Link to="/roteiros" className="hover:text-gray-300">Roteiros</Link>
                        <Link to="/calendario" className="hover:text-gray-300">Calendário</Link>
                        <Link to="/equipamentos" className="hover:text-gray-300">Equipamentos</Link>
                        <Link to="/checklists" className="hover:text-gray-300">Checklists</Link>
                        <Link to="/configuracoes" className="hover:text-gray-300">Configurações</Link>
                        {currentUser && (
                            <div className="flex items-center ml-4">
                                <span className="mr-3 font-medium text-yellow-300">
                                    {currentUser.nome_completo || currentUser.nome_usuario}
                                </span>
                                <button 
                                    onClick={handleLogout} 
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Sair
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
            </header>
            <main className="flex-grow container mx-auto p-4">
                {children}
            </main>
            <footer className="bg-gray-700 text-white text-center p-4 mt-auto">
                <p>&copy; {new Date().getFullYear()} ProdutoraMax. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};

export default MainLayout;

