import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; // Ajuste o caminho se necessário

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null);
    const [newUser, setNewUser] = useState({
        nome_usuario: '',
        senha: '',
        nome_completo: '',
        email: '',
        perfil_apresentador: false,
    });
    const [editUserForm, setEditUserForm] = useState({
        id: '',
        nome_completo: '',
        email: '',
        perfil_apresentador: false,
    });
    const [changePasswordForm, setChangePasswordForm] = useState({
        id: '',
        nova_senha: '',
    });

    const { token } = useAuth();
    const API_URL = process.env.REACT_APP_API_URL || 'http://dropvideo.ddns.net:3001/api';

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao buscar usuários.');
            console.error("Erro ao buscar usuários:", err);
        }
        setIsLoading(false);
    }, [token, API_URL]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleInputChange = (e, formSetter, formState) => {
        const { name, value, type, checked } = e.target;
        formSetter({
            ...formState,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/users`, newUser, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowAddModal(false);
            setNewUser({ nome_usuario: '', senha: '', nome_completo: '', email: '', perfil_apresentador: false });
            fetchUsers(); // Refresh a lista
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao adicionar usuário.');
            console.error("Erro ao adicionar usuário:", err);
        }
        setIsLoading(false);
    };

    const openEditModal = (user) => {
        setCurrentUserToEdit(user);
        setEditUserForm({
            id: user.id,
            nome_completo: user.nome_completo || '',
            email: user.email || '',
            perfil_apresentador: user.perfil_apresentador || false,
        });
        setShowEditModal(true);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.put(`${API_URL}/users/${editUserForm.id}`, {
                nome_completo: editUserForm.nome_completo,
                email: editUserForm.email,
                perfil_apresentador: editUserForm.perfil_apresentador,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowEditModal(false);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao editar usuário.');
            console.error("Erro ao editar usuário:", err);
        }
        setIsLoading(false);
    };
    
    const openChangePasswordModal = (user) => {
        setChangePasswordForm({ id: user.id, nova_senha: '' });
        setShowChangePasswordModal(true);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.put(`${API_URL}/users/${changePasswordForm.id}/change-password`, {
                nova_senha: changePasswordForm.nova_senha,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowChangePasswordModal(false);
            // Não precisa dar fetchUsers aqui, pois a senha não é exibida
            alert('Senha alterada com sucesso!');
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao alterar senha.');
            console.error("Erro ao alterar senha:", err);
        }
        setIsLoading(false);
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
            setIsLoading(true);
            try {
                await axios.delete(`${API_URL}/users/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                fetchUsers();
            } catch (err) {
                setError(err.response?.data?.message || 'Erro ao excluir usuário.');
                console.error("Erro ao excluir usuário:", err);
            }
            setIsLoading(false);
        }
    };

    if (isLoading && !users.length) return <p className="text-center p-4">Carregando usuários...</p>;
    

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Gerenciamento de Usuários</h1>
            
            {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">Erro: {error}</p>}
            
            <button 
                onClick={() => setShowAddModal(true)} 
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
            >
                Adicionar Novo Usuário
            </button>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-md rounded-lg">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="py-3 px-4 uppercase font-semibold text-sm text-left">ID</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Nome de Usuário</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Nome Completo</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Email</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm text-center">Apresentador</th>
                            <th className="py-3 px-4 uppercase font-semibold text-sm text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-100">
                                <td className="py-3 px-4">{user.id}</td>
                                <td className="py-3 px-4">{user.nome_usuario}</td>
                                <td className="py-3 px-4">{user.nome_completo}</td>
                                <td className="py-3 px-4">{user.email}</td>
                                <td className="py-3 px-4 text-center">{user.perfil_apresentador ? 'Sim' : 'Não'}</td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <button onClick={() => openEditModal(user)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded text-xs mr-1">Editar</button>
                                    <button onClick={() => openChangePasswordModal(user)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs mr-1">Alterar Senha</button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs">Excluir</button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan="6" className="py-3 px-4 text-center">Nenhum usuário encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Adicionar Usuário */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md mx-auto">
                        <h2 className="text-xl font-bold mb-4">Adicionar Novo Usuário</h2>
                        <form onSubmit={handleAddUser}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome_usuario">Nome de Usuário*</label>
                                <input type="text" name="nome_usuario" id="nome_usuario" value={newUser.nome_usuario} onChange={(e) => handleInputChange(e, setNewUser, newUser)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="senha">Senha*</label>
                                <input type="password" name="senha" id="senha" value={newUser.senha} onChange={(e) => handleInputChange(e, setNewUser, newUser)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome_completo">Nome Completo*</label>
                                <input type="text" name="nome_completo" id="nome_completo" value={newUser.nome_completo} onChange={(e) => handleInputChange(e, setNewUser, newUser)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                                <input type="email" name="email" id="email" value={newUser.email} onChange={(e) => handleInputChange(e, setNewUser, newUser)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    <input type="checkbox" name="perfil_apresentador" checked={newUser.perfil_apresentador} onChange={(e) => handleInputChange(e, setNewUser, newUser)} className="mr-2 leading-tight" />
                                    <span className="text-sm">É Apresentador?</span>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Usuário'}</button>
                                <button type="button" onClick={() => setShowAddModal(false)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Usuário */}
            {showEditModal && currentUserToEdit && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md mx-auto">
                        <h2 className="text-xl font-bold mb-4">Editar Usuário: {currentUserToEdit.nome_usuario}</h2>
                        <form onSubmit={handleEditUser}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit_nome_completo">Nome Completo*</label>
                                <input type="text" name="nome_completo" id="edit_nome_completo" value={editUserForm.nome_completo} onChange={(e) => handleInputChange(e, setEditUserForm, editUserForm)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit_email">Email</label>
                                <input type="email" name="email" id="edit_email" value={editUserForm.email} onChange={(e) => handleInputChange(e, setEditUserForm, editUserForm)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    <input type="checkbox" name="perfil_apresentador" checked={editUserForm.perfil_apresentador} onChange={(e) => handleInputChange(e, setEditUserForm, editUserForm)} className="mr-2 leading-tight" />
                                    <span className="text-sm">É Apresentador?</span>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</button>
                                <button type="button" onClick={() => setShowEditModal(false)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Alterar Senha */}
            {showChangePasswordModal && changePasswordForm.id && (
                 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md mx-auto">
                        <h2 className="text-xl font-bold mb-4">Alterar Senha do Usuário</h2>
                        <form onSubmit={handleChangePassword}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nova_senha">Nova Senha*</label>
                                <input type="password" name="nova_senha" id="nova_senha" value={changePasswordForm.nova_senha} onChange={(e) => handleInputChange(e, setChangePasswordForm, changePasswordForm)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required />
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Alterar Senha'}</button>
                                <button type="button" onClick={() => setShowChangePasswordModal(false)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;

