import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoteirosPage from './pages/RoteirosPage';
import RoteiroEditPage from './pages/RoteiroEditPage';
import CalendarioPage from './pages/CalendarioPage';
import EquipamentosPage from './pages/EquipamentosPage';
import ChecklistPage from './pages/ChecklistPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/PrivateRoute'; // Corrigido para o caminho dentro de src
import AuthProvider, { useAuth } from './contexts/AuthContext'; // Corrigido para o caminho dentro de src

const MainLayout = ({ children }) => {
    const { logout, user } = useAuth();

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-gray-800 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold hover:text-gray-300">ProdutoraDash</Link>
                    <nav className="space-x-4">
                        <Link to="/" className="hover:text-gray-300">Dashboard</Link>
                        <Link to="/roteiros" className="hover:text-gray-300">Roteiros</Link>
                        <Link to="/calendario" className="hover:text-gray-300">Calendário</Link>
                        <Link to="/equipamentos" className="hover:text-gray-300">Equipamentos</Link>
                        <Link to="/checklists" className="hover:text-gray-300">Checklists</Link>
                        <Link to="/gerenciar-usuarios" className="hover:text-gray-300">Usuários</Link> 
                        <Link to="/configuracoes" className="hover:text-gray-300">Configurações</Link>
                        <button onClick={logout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                            Sair
                        </button>
                    </nav>
                </div>
            </header>
            <main className="flex-grow container mx-auto p-4">
                {user && <p className='text-right text-sm text-gray-600 mb-2'>Logado como: {user.nome_usuario}</p>}
                {children}
            </main>
            <footer className="bg-gray-200 text-center p-4 text-sm text-gray-600">
                © {new Date().getFullYear()} ProdutoraDash. Todos os direitos reservados.
            </footer>
        </div>
    );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <MainLayout><DashboardPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/roteiros" 
            element={
              <PrivateRoute>
                <MainLayout><RoteirosPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/roteiros/novo" 
            element={
              <PrivateRoute>
                <MainLayout><RoteiroEditPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/roteiros/editar/:id" 
            element={
              <PrivateRoute>
                <MainLayout><RoteiroEditPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/calendario" 
            element={
              <PrivateRoute>
                <MainLayout><CalendarioPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/equipamentos" 
            element={
              <PrivateRoute>
                <MainLayout><EquipamentosPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/checklists" 
            element={
              <PrivateRoute>
                <MainLayout><ChecklistPage /></MainLayout>
              </PrivateRoute>
            }
          />
           <Route 
            path="/checklists/novo" 
            element={
              <PrivateRoute>
                <MainLayout>{/* Placeholder for ChecklistCreatePage */}</MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/checklists/editar/:id" 
            element={
              <PrivateRoute>
                <MainLayout>{/* Placeholder for ChecklistEditPage */}</MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/configuracoes" 
            element={
              <PrivateRoute>
                <MainLayout><SettingsPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route 
            path="/gerenciar-usuarios"
            element={
              <PrivateRoute>
                <MainLayout><UserManagementPage /></MainLayout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

