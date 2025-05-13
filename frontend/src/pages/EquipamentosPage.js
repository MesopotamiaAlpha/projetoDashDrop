import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const EquipamentosPage = () => {
    const { currentUser } = useAuth();
    const [equipamentos, setEquipamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for new/editing equipamento modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEquipamento, setCurrentEquipamento] = useState(null); // null for new, object for editing
    const [nome, setNome] = useState('');
    const [numeroSerie, setNumeroSerie] = useState('');
    const [categoria, setCategoria] = useState('');
    const [dataUltimaManutencao, setDataUltimaManutencao] = useState('');
    const [tipoEquipamento, setTipoEquipamento] = useState('');

    const fetchEquipamentos = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_URL}/equipamentos`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setEquipamentos(response.data);
        } catch (err) {
            console.error("Erro ao buscar equipamentos:", err);
            setError('Falha ao carregar equipamentos. Tente novamente mais tarde.');
        }
        setLoading(false);
    }, [currentUser]);

    useEffect(() => {
        fetchEquipamentos();
    }, [fetchEquipamentos]);

    const openModalForNew = () => {
        setCurrentEquipamento(null);
        setNome('');
        setNumeroSerie('');
        setCategoria('');
        setDataUltimaManutencao('');
        setTipoEquipamento('');
        setIsModalOpen(true);
    };

    const openModalForEdit = (equipamento) => {
        setCurrentEquipamento(equipamento);
        setNome(equipamento.nome);
        setNumeroSerie(equipamento.numero_serie || '');
        setCategoria(equipamento.categoria || '');
        setDataUltimaManutencao(equipamento.data_ultima_manutencao ? new Date(equipamento.data_ultima_manutencao).toISOString().split('T')[0] : '');
        setTipoEquipamento(equipamento.tipo_equipamento || '');
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            nome,
            numero_serie: numeroSerie || null,
            categoria: categoria || null,
            data_ultima_manutencao: dataUltimaManutencao || null,
            tipo_equipamento: tipoEquipamento || null,
        };

        try {
            if (currentEquipamento && currentEquipamento.id) {
                await axios.put(`${API_URL}/equipamentos/${currentEquipamento.id}`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
            } else {
                await axios.post(`${API_URL}/equipamentos`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
            }
            setIsModalOpen(false);
            fetchEquipamentos(); // Refresh list
        } catch (err) {
            console.error("Erro ao salvar equipamento:", err.response ? err.response.data : err);
            setError(err.response?.data?.message || 'Falha ao salvar equipamento.');
        }
        setLoading(false);
    };

    const handleDeleteEquipamento = async (equipamentoId) => {
        if (!window.confirm("Tem certeza que deseja excluir este equipamento? Esta ação não pode ser desfeita e pode afetar checklists existentes se não for verificado no backend.")) {
            return;
        }
        try {
            await axios.delete(`${API_URL}/equipamentos/${equipamentoId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            fetchEquipamentos(); // Refresh list
        } catch (err) {
            console.error("Erro ao excluir equipamento:", err);
            setError(err.response?.data?.message || 'Falha ao excluir equipamento. Verifique se ele não está em uso em algum checklist.');
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gerenciamento de Equipamentos</h1>
                <button 
                    onClick={openModalForNew}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                >
                    Cadastrar Novo Equipamento
                </button>
            </div>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

            {loading ? (
                <p className="text-center text-gray-600">Carregando equipamentos...</p>
            ) : equipamentos.length === 0 ? (
                <p className="text-center text-gray-600">Nenhum equipamento cadastrado.</p>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº de Série</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Manutenção</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {equipamentos.map(equip => (
                                <tr key={equip.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{equip.nome}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equip.numero_serie || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equip.categoria || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equip.tipo_equipamento || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {equip.data_ultima_manutencao ? new Date(equip.data_ultima_manutencao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onClick={() => openModalForEdit(equip)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                        <button onClick={() => handleDeleteEquipamento(equip.id)} className="text-red-600 hover:text-red-900">Excluir</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal para Adicionar/Editar Equipamento */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentEquipamento ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}</h2>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="nomeEquipModal" className="block text-sm font-medium text-gray-700">Nome do Equipamento:</label>
                                <input type="text" id="nomeEquipModal" value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="numeroSerieModal" className="block text-sm font-medium text-gray-700">Número de Série (opcional):</label>
                                <input type="text" id="numeroSerieModal" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="categoriaModal" className="block text-sm font-medium text-gray-700">Categoria (opcional):</label>
                                <input type="text" id="categoriaModal" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="tipoEquipamentoModal" className="block text-sm font-medium text-gray-700">Tipo do Equipamento (opcional):</label>
                                <input type="text" id="tipoEquipamentoModal" value={tipoEquipamento} onChange={(e) => setTipoEquipamento(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="dataUltimaManutencaoModal" className="block text-sm font-medium text-gray-700">Data da Última Manutenção (opcional):</label>
                                <input type="date" id="dataUltimaManutencaoModal" value={dataUltimaManutencao} onChange={(e) => setDataUltimaManutencao(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancelar</button>
                                <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-green-300">
                                    {loading ? 'Salvando...' : (currentEquipamento ? 'Atualizar Equipamento' : 'Cadastrar Equipamento')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipamentosPage;

