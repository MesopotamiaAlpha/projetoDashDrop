import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from "jspdf";

const API_URL = process.env.REACT_APP_API_URL || 'http://dropvideo.ddns.net:3001/api';

const ChecklistPage = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for new/editing checklist modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentChecklist, setCurrentChecklist] = useState(null); // null for new, object for editing
    const [nomeGravacaoAssociada, setNomeGravacaoAssociada] = useState('');
    const [dataChecklist, setDataChecklist] = useState(new Date().toISOString().split('T')[0]);
    const [eventoId, setEventoId] = useState(null); // Optional: link to a calendar event
    const [availableEventos, setAvailableEventos] = useState([]);
    const [itensChecklist, setItensChecklist] = useState([{ equipamento_id: '', quantidade_a_levar: 1 }]);
    const [availableEquipamentos, setAvailableEquipamentos] = useState([]);

    const fetchChecklists = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_URL}/checklists`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setChecklists(response.data);
        } catch (err) {
            console.error("Erro ao buscar checklists:", err);
            setError('Falha ao carregar checklists. Tente novamente mais tarde.');
        }
        setLoading(false);
    }, [currentUser]);

    const fetchEquipamentosEEventos = useCallback(async () => {
        if (!currentUser) return;
        try {
            const [equipResponse, eventosResponse] = await Promise.all([
                axios.get(`${API_URL}/equipamentos`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }),
                axios.get(`${API_URL}/calendario/eventos`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }) // Fetch all events for selection
            ]);
            setAvailableEquipamentos(equipResponse.data);
            setAvailableEventos(eventosResponse.data);
        } catch (err) {
            console.error("Erro ao buscar equipamentos ou eventos:", err);
            setError('Falha ao carregar dados de suporte para checklists.');
        }
    }, [currentUser]);

    useEffect(() => {
        fetchChecklists();
        fetchEquipamentosEEventos();
    }, [fetchChecklists, fetchEquipamentosEEventos]);

    const resetModalForm = () => {
        setNomeGravacaoAssociada('');
        setDataChecklist(new Date().toISOString().split('T')[0]);
        setEventoId(null);
        setItensChecklist([{ equipamento_id: '', quantidade_a_levar: 1 }]);
        setCurrentChecklist(null);
    };

    const openModalForNew = () => {
        resetModalForm();
        setIsModalOpen(true);
    };

    const openModalForEdit = async (checklist) => {
        setLoading(true); // For loading checklist details
        try {
            const response = await axios.get(`${API_URL}/checklists/${checklist.id}`, {
                 headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            const detailedChecklist = response.data;
            setCurrentChecklist(detailedChecklist);
            setNomeGravacaoAssociada(detailedChecklist.nome_gravacao_associada);
            setDataChecklist(new Date(detailedChecklist.data_checklist).toISOString().split('T')[0]);
            setEventoId(detailedChecklist.evento_id || null);
            setItensChecklist(detailedChecklist.itens.length > 0 ? detailedChecklist.itens.map(item => ({ equipamento_id: item.equipamento_id, quantidade_a_levar: item.quantidade_a_levar })) : [{ equipamento_id: '', quantidade_a_levar: 1 }]);
            setIsModalOpen(true);
        } catch (err) {
            console.error("Erro ao carregar detalhes do checklist:", err);
            setError("Falha ao carregar detalhes do checklist para edição.");
        }
        setLoading(false);
    };

    const handleItemChange = (index, field, value) => {
        const newItens = [...itensChecklist];
        newItens[index][field] = value;
        setItensChecklist(newItens);
    };

    const addItem = () => {
        setItensChecklist([...itensChecklist, { equipamento_id: '', quantidade_a_levar: 1 }]);
    };

    const removeItem = (index) => {
        if (itensChecklist.length <= 1) return; // Keep at least one item row
        const newItens = itensChecklist.filter((_, i) => i !== index);
        setItensChecklist(newItens);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        // setLoading(true); // Already handled by button state
        setError('');

        const payload = {
            nome_gravacao_associada: nomeGravacaoAssociada,
            data_checklist: dataChecklist,
            evento_id: eventoId || null,
            itens: itensChecklist.filter(item => item.equipamento_id), // Ensure only items with selected equipment are sent
        };

        if (payload.itens.length === 0) {
            setError("Adicione pelo menos um equipamento ao checklist.");
            return;
        }

        try {
            if (currentChecklist && currentChecklist.id) {
                await axios.put(`${API_URL}/checklists/${currentChecklist.id}`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
            } else {
                await axios.post(`${API_URL}/checklists`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
            }
            setIsModalOpen(false);
            fetchChecklists(); // Refresh list
            resetModalForm();
        } catch (err) {
            console.error("Erro ao salvar checklist:", err.response ? err.response.data : err);
            setError(err.response?.data?.message || 'Falha ao salvar checklist.');
        }
        // setLoading(false);
    };

    const handleDeleteChecklist = async (checklistId) => {
        if (!window.confirm("Tem certeza que deseja excluir este checklist?")) return;
        try {
            await axios.delete(`${API_URL}/checklists/${checklistId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            fetchChecklists(); // Refresh list
        } catch (err) {
            console.error("Erro ao excluir checklist:", err);
            setError(err.response?.data?.message || 'Falha ao excluir checklist.');
        }
    };
    
    const generatePdfForChecklist = async (checklistId) => {
        try {
            const response = await axios.get(`${API_URL}/checklists/${checklistId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            const checklist = response.data;

            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Checklist de Equipamentos: ${checklist.nome_gravacao_associada}`, 14, 22);
            doc.setFontSize(11);
            doc.text(`Data: ${new Date(checklist.data_checklist).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`, 14, 30);
            if (checklist.evento_id && availableEventos.find(ev => ev.id === checklist.evento_id)) {
                 doc.text(`Evento do Calendário: ${availableEventos.find(ev => ev.id === checklist.evento_id).nome_gravacao}`, 14, 36);
            }

            let yPos = 45;
            doc.setFontSize(12);
            doc.text("Equipamento", 14, yPos);
            doc.text("Qtd.", 150, yPos);
            doc.text("Verificado", 170, yPos);
            yPos += 7;
            doc.setLineWidth(0.5);
            doc.line(14, yPos-5, 196, yPos-5); // Header line

            checklist.itens.forEach(item => {
                if (yPos > 270) { // Page break
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFontSize(10);
                const equipamentoNome = availableEquipamentos.find(eq => eq.id === item.equipamento_id)?.nome || 'Equipamento não encontrado';
                doc.text(equipamentoNome, 14, yPos);
                doc.text(item.quantidade_a_levar.toString(), 150, yPos, { align: 'right' });
                doc.rect(175, yPos - 4, 5, 5); // Checkbox square
                yPos += 8;
                doc.setLineWidth(0.1);
                doc.line(14, yPos-5, 196, yPos-5); // Item line
            });

            doc.save(`checklist_${checklist.nome_gravacao_associada.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error("Erro ao gerar PDF do checklist:", err);
            setError("Falha ao gerar PDF do checklist.");
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Checklists de Equipamentos</h1>
                <button 
                    onClick={openModalForNew}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                >
                    Criar Novo Checklist
                </button>
            </div>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

            {loading && !isModalOpen ? (
                <p className="text-center text-gray-600">Carregando checklists...</p>
            ) : checklists.length === 0 && !isModalOpen ? (
                <p className="text-center text-gray-600">Nenhum checklist encontrado.</p>
            ) : (
                !isModalOpen && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {checklists.map(cl => (
                            <div key={cl.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                                <div className="p-6 flex-grow">
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2 truncate" title={cl.nome_gravacao_associada}>{cl.nome_gravacao_associada}</h2>
                                    <p className="text-sm text-gray-600 mb-1">Data: {new Date(cl.data_checklist).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                                    <p className="text-sm text-gray-600 mb-3">Criado por: {cl.criador_nome || 'N/A'}</p>
                                    {/* Could display number of items here if fetched with the list */}
                                </div>
                                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
                                    <button onClick={() => generatePdfForChecklist(cl.id)} className="text-sm bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded">Gerar PDF</button>
                                    <button onClick={() => openModalForEdit(cl)} className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded">Editar</button>
                                    <button onClick={() => handleDeleteChecklist(cl.id)} className="text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded">Excluir</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Modal para Adicionar/Editar Checklist */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentChecklist ? 'Editar Checklist' : 'Criar Novo Checklist'}</h2>
                        {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="nomeGravacaoModal" className="block text-sm font-medium text-gray-700">Nome da Gravação Associada:</label>
                                <input type="text" id="nomeGravacaoModal" value={nomeGravacaoAssociada} onChange={(e) => setNomeGravacaoAssociada(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="dataChecklistModal" className="block text-sm font-medium text-gray-700">Data do Checklist:</label>
                                    <input type="date" id="dataChecklistModal" value={dataChecklist} onChange={(e) => setDataChecklist(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="eventoIdModal" className="block text-sm font-medium text-gray-700">Vincular ao Evento do Calendário (opcional):</label>
                                    <select id="eventoIdModal" value={eventoId || ''} onChange={(e) => setEventoId(e.target.value ? parseInt(e.target.value) : null)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                        <option value="">Nenhum</option>
                                        {availableEventos.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.nome_gravacao} ({new Date(ev.data_evento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <h3 class="text-lg font-medium text-gray-900 pt-2">Itens do Checklist:</h3>
                            {itensChecklist.map((item, index) => (
                                <div key={index} className="flex items-end gap-2 p-2 border rounded-md">
                                    <div className="flex-grow">
                                        <label htmlFor={`equipamento-${index}`} className="block text-xs font-medium text-gray-700">Equipamento:</label>
                                        <select 
                                            id={`equipamento-${index}`} 
                                            value={item.equipamento_id}
                                            onChange={(e) => handleItemChange(index, 'equipamento_id', e.target.value ? parseInt(e.target.value) : '')}
                                            required
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Selecione...</option>
                                            {availableEquipamentos.map(eq => (
                                                <option key={eq.id} value={eq.id}>{eq.nome} {eq.numero_serie ? `(${eq.numero_serie})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label htmlFor={`quantidade-${index}`} className="block text-xs font-medium text-gray-700">Qtd.:</label>
                                        <input 
                                            type="number" 
                                            id={`quantidade-${index}`} 
                                            value={item.quantidade_a_levar}
                                            onChange={(e) => handleItemChange(index, 'quantidade_a_levar', parseInt(e.target.value) || 1)}
                                            min="1"
                                            required
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    {itensChecklist.length > 1 && (
                                        <button type="button" onClick={() => removeItem(index)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded text-sm">Remover</button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addItem} className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded text-sm">Adicionar Item</button>

                            <div className="flex justify-end space-x-3 pt-6">
                                <button type="button" onClick={() => { setIsModalOpen(false); resetModalForm(); }} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancelar</button>
                                <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-green-300">
                                    {loading && currentChecklist ? 'Salvando...' : (currentChecklist ? 'Atualizar Checklist' : 'Criar Checklist')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChecklistPage;

