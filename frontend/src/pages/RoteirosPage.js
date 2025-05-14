import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext'; // Assuming you have an AuthContext for API calls

const API_URL = process.env.REACT_APP_API_URL || 'http://dropvideo.ddns.net:3001/api';

const RoteirosPage = () => {
    const [roteiros, setRoteiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroMes, setFiltroMes] = useState(''); // Empty means all months
    const [availableYears, setAvailableYears] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);

    const { currentUser } = useAuth(); // For authenticated API calls

    const fetchRoteiros = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (filtroAno) params.ano = filtroAno;
            if (filtroMes) params.mes = filtroMes;
            if (selectedTagIds.length > 0) params.tagIds = selectedTagIds.join(',');

            const response = await axios.get(`${API_URL}/roteiros`, { 
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
                params
            });
            setRoteiros(response.data);
        } catch (err) {
            console.error("Erro ao buscar roteiros:", err);
            setError('Falha ao carregar roteiros. Tente novamente mais tarde.');
        }
        setLoading(false);
    }, [currentUser, filtroAno, filtroMes, selectedTagIds]);

    const fetchTags = useCallback(async () => {
        if(!currentUser) return;
        try {
            const response = await axios.get(`${API_URL}/tags`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setAllTags(response.data);
        } catch (err) {
            console.error("Erro ao buscar tags:", err);
        }
    }, [currentUser]);

    useEffect(() => {
        // Populate available years (e.g., last 5 years + current year + next year)
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear + 1; i >= currentYear - 5; i--) {
            years.push(i);
        }
        setAvailableYears(years);
        fetchTags();
    }, [fetchTags]);

    useEffect(() => {
        fetchRoteiros();
    }, [fetchRoteiros]);

    const handleTagSelectionChange = (tagId) => {
        setSelectedTagIds(prev => 
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };
    
    const handleDeleteRoteiro = async (roteiroId) => {
        if (!window.confirm("Tem certeza que deseja excluir este roteiro? Esta ação não pode ser desfeita.")) {
            return;
        }
        try {
            await axios.delete(`${API_URL}/roteiros/${roteiroId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setRoteiros(prevRoteiros => prevRoteiros.filter(r => r.id !== roteiroId));
            // Optionally, show a success notification
        } catch (err) {
            console.error("Erro ao excluir roteiro:", err);
            setError(err.response?.data?.message || 'Falha ao excluir roteiro.');
        }
    };


    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Roteiros</h1>
                <Link 
                    to="/roteiros/novo" 
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                >
                    Criar Novo Roteiro
                </Link>
            </div>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label htmlFor="filtroAno" className="block text-sm font-medium text-gray-700">Ano:</label>
                    <select 
                        id="filtroAno" 
                        value={filtroAno}
                        onChange={(e) => setFiltroAno(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="filtroMes" className="block text-sm font-medium text-gray-700">Mês:</label>
                    <select 
                        id="filtroMes" 
                        value={filtroMes}
                        onChange={(e) => setFiltroMes(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="">Todos</option>
                        {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                            <option key={month} value={month}>{new Date(0, month-1).toLocaleString('pt-BR', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags:</label>
                    <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => (
                            <button 
                                key={tag.id} 
                                onClick={() => handleTagSelectionChange(tag.id)}
                                style={{ backgroundColor: selectedTagIds.includes(tag.id) ? tag.cor : '#E5E7EB', color: selectedTagIds.includes(tag.id) ? 'white' : 'black'}}
                                className={`px-3 py-1 rounded-full text-sm font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`}
                            >
                                {tag.nome}
                            </button>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={fetchRoteiros} 
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out self-end"
                >
                    Filtrar
                </button>
            </div>

            {loading ? (
                <p className="text-center text-gray-600">Carregando roteiros...</p>
            ) : roteiros.length === 0 ? (
                <p className="text-center text-gray-600">Nenhum roteiro encontrado com os filtros selecionados.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roteiros.map(roteiro => (
                        <div key={roteiro.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                            <div className="p-6 flex-grow">
                                <h2 className="text-xl font-semibold text-gray-800 mb-2 truncate" title={roteiro.nome}>{roteiro.nome}</h2>
                                <p className="text-sm text-gray-600 mb-1">Ano: {roteiro.ano}, Mês: {new Date(0, roteiro.mes-1).toLocaleString('pt-BR', { month: 'long' })}</p>
                                <p className="text-sm text-gray-600 mb-3">Criado por: {roteiro.criador_nome || 'N/A'}</p>
                                {roteiro.tags && roteiro.tags.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {roteiro.tags.map(tag => (
                                            <span key={tag.id} style={{ backgroundColor: tag.cor || '#DDD' }} className="px-2 py-1 text-xs font-semibold text-white rounded-full">
                                                {tag.nome}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
                                <Link 
                                    to={`/roteiros/editar/${roteiro.id}`} 
                                    className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded transition duration-150 ease-in-out"
                                >
                                    Editar
                                </Link>
                                <button 
                                    onClick={() => handleDeleteRoteiro(roteiro.id)}
                                    className="text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded transition duration-150 ease-in-out"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RoteirosPage;

