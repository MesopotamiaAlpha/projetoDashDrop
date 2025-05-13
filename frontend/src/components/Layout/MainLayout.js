import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-gray-800 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold hover:text-gray-300">
                        ProdutoraMax
                    </Link>
                    <nav className="space-x-4">
                        <Link to="/" className="hover:text-gray-300">Dashboard</Link>
                        <Link to="/roteiros" className="hover:text-gray-300">Roteiros</Link>
                        <Link to="/calendario" className="hover:text-gray-300">Calendário</Link>
                        <Link to="/equipamentos" className="hover:text-gray-300">Equipamentos</Link>
                        <Link to="/checklists" className="hover:text-gray-300">Checklists</Link>
                        <Link to="/configuracoes" className="hover:text-gray-300">Configurações</Link>
                        {currentUser && (
                            <button 
                                onClick={handleLogout} 
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Sair ({currentUser.nome_usuario})
                            </button>
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

