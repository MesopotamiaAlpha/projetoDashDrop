import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select'; // Import react-select
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect for adding new tags
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid'; 

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper to get contrasting text color (simple version)
const getContrastYIQ = (hexcolor) => {
    if (!hexcolor) return '#000000'; // Default to black if no color
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

// Custom styles for react-select tags
const tagSelectStyles = {
    multiValue: (styles, { data }) => {
        const color = data.color || '#cccccc'; // Use tag color or default
        return {
            ...styles,
            backgroundColor: color,
            color: getContrastYIQ(color),
            borderRadius: '4px',
            padding: '1px 3px',
            display: 'flex',
            alignItems: 'center',
        };
    },
    multiValueLabel: (styles, { data }) => ({
        ...styles,
        color: getContrastYIQ(data.color || '#cccccc'),
        fontSize: '0.8rem', 
        paddingRight: '3px',
    }),
    multiValueRemove: (styles, { data }) => ({
        ...styles,
        color: getContrastYIQ(data.color || '#cccccc'),
        ':hover': {
            backgroundColor: data.color || '#cccccc',
            color: 'white',
            cursor: 'pointer',
        },
    }),
    option: (styles, { data, isFocused, isSelected }) => {
        const color = data.color || '#cccccc';
        return {
            ...styles,
            backgroundColor: isSelected ? color : isFocused ? '#f0f0f0' : null,
            color: isSelected ? getContrastYIQ(color) : '#333333',
            ':before': { // Simple tag icon simulation
                content: '"🏷️"', // Tag emoji
                display: 'inline-block',
                marginRight: '8px',
            },
        };
    },
    // Add other style customizations if needed (control, menu, etc.)
};

const RoteiroEditPage = () => {
    const { id: roteiroId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [nome, setNome] = useState('');
    const [tipoRoteiro, setTipoRoteiro] = useState('');
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [dataCriacaoDocumento, setDataCriacaoDocumento] = useState(new Date().toISOString().split('T')[0]);
    // Roteiro-level tags (keep if needed, or remove if tags are only per-scene)
    // const [tags, setTags] = useState([]); 
    const [allTags, setAllTags] = useState([]); // All available tags for dropdowns
    const [cenas, setCenas] = useState([]);
    const [logoEmpresaUrl, setLogoEmpresaUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [eventos, setEventos] = useState([]);
    const [eventoId, setEventoId] = useState('');
    const [loadingEventos, setLoadingEventos] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);

    const isEditing = Boolean(roteiroId);

    // Fetch all available tags for the dropdowns
    const fetchAllTags = useCallback(async () => {
        if (!currentUser) return;
        setLoadingTags(true);
        try {
            const response = await axios.get(`${API_URL}/tags`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            // Format for react-select: { value: id, label: nome, color: cor }
            const formattedTags = response.data.map(tag => ({
                value: tag.id,
                label: tag.nome,
                color: tag.cor
            }));
            setAllTags(formattedTags);
        } catch (err) {
            console.error("Erro ao buscar todas as tags:", err);
            setError('Falha ao carregar tags disponíveis.');
        }
        setLoadingTags(false);
    }, [currentUser]);

    const fetchRoteiroData = useCallback(async () => {
        if (!isEditing || !currentUser) return;
        setLoading(true);
        setError('');
        try {
            // Fetch roteiro details (including roteiro-level tags if kept)
            const response = await axios.get(`${API_URL}/roteiros/${roteiroId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            const roteiro = response.data;
            setNome(roteiro.nome);
            setTipoRoteiro(roteiro.tipo_roteiro || '');
            setAno(roteiro.ano);
            setMes(roteiro.mes);
            setDataCriacaoDocumento(roteiro.data_criacao_documento ? new Date(roteiro.data_criacao_documento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            // setTags(roteiro.tags ? roteiro.tags.map(t => t.id) : []); // Roteiro-level tags
            setEventoId(roteiro.evento_id || '');

            // Fetch cenas (backend now returns tags for each cena)
            const cenasResponse = await axios.get(`${API_URL}/roteiros/${roteiroId}/cenas`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            const fetchedCenas = cenasResponse.data.map(c => ({
                ...c,
                db_id: c.id, 
                id: uuidv4(), // Frontend unique ID
                type: c.tipo_linha || 'pauta',
                nomeDivisao: c.nome_divisao || (c.tipo_linha === 'divisoria' ? 'NOVA CENA' : ''),
                localizacao: c.localizacao || '',
                // Map fetched tags to the format react-select expects
                tags: c.tags ? c.tags.map(tag => ({ value: tag.id, label: tag.nome, color: tag.cor })) : [] 
            }));

            if (fetchedCenas.length === 0) {
                 setCenas([
                    { id: uuidv4(), type: 'divisoria', nomeDivisao: 'NOVA CENA', tags: [] },
                    { id: uuidv4(), type: 'pauta', video: '', tec_transicao: '', audio: '', localizacao: '', tags: [] }
                ]);
            } else {
                setCenas(fetchedCenas);
            }

        } catch (err) {
            console.error("Erro ao buscar dados do roteiro:", err);
            setError('Falha ao carregar dados do roteiro.');
        }
        setLoading(false);
    }, [isEditing, roteiroId, currentUser]);

    // Fetch User Logo (unchanged)
    const fetchUserLogo = useCallback(async () => {
        if (!currentUser || !currentUser.id) return;
        try {
            const userProfileResponse = await axios.get(`${API_URL}/users/me`, { 
                 headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (userProfileResponse.data.logo_empresa_path) {
                 setLogoEmpresaUrl(userProfileResponse.data.logo_empresa_path);
            }
        } catch (err) {
            console.error("Erro ao buscar logo da empresa:", err);
        }
    }, [currentUser]);
    
    // Fetch Eventos for Dropdown (unchanged)
    const fetchEventos = useCallback(async () => {
        if (!currentUser) return;
        setLoadingEventos(true);
        try {
            const response = await axios.get(`${API_URL}/roteiros/eventos-dropdown`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setEventos(response.data);
        } catch (err) {
            console.error("Erro ao buscar eventos do calendário:", err);
        }
        setLoadingEventos(false);
    }, [currentUser]);

    // Initial useEffect
    useEffect(() => {
        fetchAllTags(); // Fetch all tags on mount
        fetchUserLogo();
        fetchEventos(); 
        if (isEditing) {
            fetchRoteiroData();
        } else {
            // Start new roteiro with initial scene division and blank line
            setCenas([
                { id: uuidv4(), type: 'divisoria', nomeDivisao: 'NOVA CENA', tags: [] },
                { id: uuidv4(), type: 'pauta', video: '', tec_transicao: '', audio: '', localizacao: '', tags: [] }
            ]);
            setDataCriacaoDocumento(new Date().toISOString().split('T')[0]);
            setAno(new Date().getFullYear());
            setMes(new Date().getMonth() + 1);
        }
    }, [isEditing, fetchRoteiroData, fetchAllTags, fetchUserLogo, fetchEventos]); // Added fetchAllTags dependency

    // Handle changes in regular scene fields
    const handleCenaChange = (id, field, value) => {
        setCenas(prevCenas => prevCenas.map(cena => {
            if (cena.id === id) {
                return { ...cena, [field]: value }; 
            }
            return cena;
        }));
    };

    // Handle changes in scene tags using react-select
    const handleCenaTagsChange = (id, selectedOptions) => {
        setCenas(prevCenas => prevCenas.map(cena => {
            if (cena.id === id) {
                return { ...cena, tags: selectedOptions || [] }; // Update tags array for the specific cena
            }
            return cena;
        }));
    };

    // Handle creation of a new tag via CreatableSelect
    const handleCreateTag = async (inputValue) => {
        if (!inputValue || loadingTags) return;
        setLoadingTags(true); // Indicate loading while creating tag
        setError('');
        try {
            const response = await axios.post(`${API_URL}/tags`, 
                { nome: inputValue }, // Backend will generate color if not provided
                { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
            );
            const newTag = response.data.tag;
            const newTagOption = { value: newTag.id, label: newTag.nome, color: newTag.cor };
            
            // Add the new tag to the list of all available tags
            setAllTags(prevTags => [...prevTags, newTagOption]);
            
            // Optionally, immediately add the new tag to the current scene's tags
            // Find which scene triggered the creation (might need context or pass cenaId)
            // For simplicity, we just add it to the available options here.
            // The user can then select it.
            
        } catch (err) {
            console.error("Erro ao criar nova tag:", err);
            setError(err.response?.data?.message || 'Falha ao criar nova tag.');
        }
        setLoadingTags(false);
    };

    // Add new blank line
    const addLinha = () => {
        setCenas([...cenas, { id: uuidv4(), type: 'pauta', video: '', tec_transicao: '', audio: '', localizacao: '', tags: [] }]);
    };

    // Add new scene division
    const addDivisaoCena = () => {
        setCenas([...cenas, { id: uuidv4(), type: 'divisoria', nomeDivisao: 'NOVA CENA', tags: [] }]);
    };

    // Remove line
    const removeLinha = (idToRemove) => {
        const pautaLines = cenas.filter(c => c.type === 'pauta');
        if (pautaLines.length <= 1 && cenas.find(c => c.id === idToRemove)?.type === 'pauta') return;
        setCenas(prevCenas => prevCenas.filter(cena => cena.id !== idToRemove));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        const roteiroDataPayload = {
            nome,
            tipo_roteiro: tipoRoteiro,
            ano: parseInt(ano),
            mes: parseInt(mes),
            data_criacao_documento: dataCriacaoDocumento,
            // tags: tags, // Roteiro-level tags (if kept)
            evento_id: eventoId || null
        };

        try {
            let currentRoteiroId = roteiroId;
            // Save or Update Roteiro details
            if (isEditing) {
                await axios.put(`${API_URL}/roteiros/${roteiroId}`, roteiroDataPayload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
            } else {
                const response = await axios.post(`${API_URL}/roteiros`, roteiroDataPayload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
                currentRoteiroId = response.data.roteiroId;
            }

            // --- Sync Cenas --- 
            let existingCenaDbIds = [];
            if(isEditing && currentRoteiroId) {
                try {
                    const cenasExistentesRes = await axios.get(`${API_URL}/roteiros/${currentRoteiroId}/cenas`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    });
                    existingCenaDbIds = cenasExistentesRes.data.map(c => c.id);
                } catch (fetchErr) {
                    console.warn("Não foi possível buscar cenas existentes para diff", fetchErr);
                }
            }

            const frontendCenaDbIds = cenas.map(c => c.db_id).filter(id => id !== undefined);
            const cenasToDelete = existingCenaDbIds.filter(dbId => !frontendCenaDbIds.includes(dbId));

            // Delete scenes removed in frontend
            for (const cenaIdToDelete of cenasToDelete) {
                await axios.delete(`${API_URL}/roteiros/${currentRoteiroId}/cenas/${cenaIdToDelete}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
            }

            // Create or Update scenes from frontend
            for (let i = 0; i < cenas.length; i++) {
                const cena = cenas[i];
                const cenaPayload = {
                    ordem: i,
                    tipo_linha: cena.type,
                    video: cena.type === 'pauta' ? cena.video : null,
                    tec_transicao: cena.type === 'pauta' ? cena.tec_transicao : null,
                    audio: cena.type === 'pauta' ? cena.audio : null,
                    localizacao: cena.type === 'pauta' ? cena.localizacao : null,
                    nome_divisao: cena.type === 'divisoria' ? cena.nomeDivisao : null,
                    // Send only the IDs of the selected tags for this scene
                    tagIds: cena.tags ? cena.tags.map(tag => tag.value) : [] 
                };

                if (cena.db_id) { // Update existing scene
                    await axios.put(`${API_URL}/roteiros/${currentRoteiroId}/cenas/${cena.db_id}`, cenaPayload, {
                         headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    });
                } else { // Create new scene
                    await axios.post(`${API_URL}/roteiros/${currentRoteiroId}/cenas`, cenaPayload, {
                         headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    });
                }
            }
            // --- End Sync Cenas --- 
            
            setSuccessMessage(`Roteiro ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            if (!isEditing && currentRoteiroId) {
                navigate(`/roteiros/editar/${currentRoteiroId}`);
            } else if (currentRoteiroId) {
                // Re-fetch data after saving to get updated db_ids and tags
                fetchRoteiroData(); 
                fetchAllTags(); // Re-fetch tags in case new ones were created
            }

        } catch (err) {
            console.error("Erro ao salvar roteiro:", err.response ? err.response.data : err);
            setError(err.response?.data?.message || `Falha ao salvar roteiro.`);
        }
        setLoading(false);
    };
    
    // PDF and Print handlers (unchanged for now, PDF needs update later)
    const handleGeneratePdf = async () => {
        if (!roteiroId) {
            setError("Salve o roteiro antes de gerar o PDF.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            // IMPORTANT: This endpoint needs to be updated in the backend 
            // to include tags in the PDF generation (Step 6)
            const response = await axios.get(`${API_URL}/roteiros/${roteiroId}/export-pdf`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            const safeNome = nome.replace(/[^a-zA-Z0-9]/g, '_') || 'roteiro';
            link.download = `roteiro_${safeNome}.pdf`;
            link.click();
            window.URL.revokeObjectURL(link.href);
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
            setError(err.response?.data?.message || 'Falha ao gerar PDF.');
        }
        setLoading(false);
    };
    
    const handlePrint = () => {
        // Print area needs adjustment if tags shouldn't be printed
        const printArea = document.getElementById('roteiro-print-area');
        if (!printArea) return;
        
        // Clone the table to modify for printing (remove tags)
        const tableClone = printArea.querySelector('table').cloneNode(true);
        
        // Remove tag elements from the clone (example selector, adjust as needed)
        tableClone.querySelectorAll('.tag-selector-container').forEach(el => el.remove());
        tableClone.querySelectorAll('.tags-display-area').forEach(el => el.remove()); // If tags are displayed separately
        
        const printContents = `<html><head><title>Imprimir Roteiro</title></head><body>${tableClone.outerHTML}</body></html>`; // Basic structure
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContents);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    if (loading && isEditing && !nome) {
        return <p className="text-center text-gray-600 mt-10">Carregando dados do roteiro...</p>;
    }

    return (
        <div className="container mx-auto p-4">
            {/* Header and Form Meta Info (Nome, Tipo, Ano, Mes, Data, Evento) - Unchanged */} 
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-gray-800">{isEditing ? 'Editar Roteiro' : 'Novo Roteiro'}</h1>
                 {/* Buttons */} 
                 <div className="flex space-x-2">
                     {isEditing && (
                         <>
                             <button 
                                 onClick={handleGeneratePdf}
                                 className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                                 disabled={loading}
                             >
                                 {loading ? 'Gerando...' : 'Gerar PDF'}
                             </button>
                             {/* <button 
                                 onClick={handlePrint}
                                 className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                                 disabled={loading}
                             >
                                 Imprimir
                             </button> */}
                         </>
                     )}
                     <Link to="/roteiros" className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
                         Voltar
                     </Link>
                 </div>
            </div>

            {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}
            {successMessage && <p className="text-green-500 bg-green-100 p-3 rounded mb-4">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Nome */} 
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">
                            Nome do Roteiro
                        </label>
                        <input 
                            id="nome" 
                            type="text" 
                            value={nome} 
                            onChange={(e) => setNome(e.target.value)} 
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required 
                        />
                    </div>
                    {/* Tipo */} 
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tipoRoteiro">
                            Tipo
                        </label>
                        <input 
                            id="tipoRoteiro" 
                            type="text" 
                            value={tipoRoteiro} 
                            onChange={(e) => setTipoRoteiro(e.target.value)} 
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    {/* Vincular à Gravação */} 
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="eventoId">
                            Vincular à Gravação (opcional)
                        </label>
                        <select
                            id="eventoId"
                            value={eventoId}
                            onChange={(e) => setEventoId(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled={loadingEventos}
                        >
                            <option value="">Selecione uma gravação...</option>
                            {eventos.map(evento => (
                                <option key={evento.id} value={evento.id}>{evento.nome}</option>
                            ))}
                        </select>
                    </div>
                    {/* Ano, Mês, Data Criação */} 
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ano">
                            Ano
                        </label>
                        <input 
                            id="ano" 
                            type="number" 
                            value={ano} 
                            onChange={(e) => setAno(e.target.value)} 
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mes">
                            Mês
                        </label>
                        <input 
                            id="mes" 
                            type="number" 
                            min="1" max="12" 
                            value={mes} 
                            onChange={(e) => setMes(e.target.value)} 
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dataCriacaoDocumento">
                            Data Criação Documento
                        </label>
                        <input 
                            id="dataCriacaoDocumento" 
                            type="date" 
                            value={dataCriacaoDocumento} 
                            onChange={(e) => setDataCriacaoDocumento(e.target.value)} 
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required 
                        />
                    </div>
                </div>

                {/* Tabela de Edição do Roteiro */} 
                <div id="roteiro-print-area" className="mb-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border">
                            <thead className="bg-gray-50">
                                <tr>
                                    {/* Cabeçalho Centralizado */}
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Localização / Tags</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vídeo</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tec / Transição</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Áudio</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cenas.map((cena) => (
                                    <tr key={cena.id} className={cena.type === 'divisoria' ? 'bg-gray-100' : ''}>
                                        {cena.type === 'divisoria' ? (
                                            <td colSpan="5" className="px-6 py-2 whitespace-nowrap">
                                                <div className="flex items-center justify-between">
                                                    <input 
                                                        type="text" 
                                                        value={cena.nomeDivisao || ''} 
                                                        onChange={(e) => handleCenaChange(cena.id, 'nomeDivisao', e.target.value)} 
                                                        className="block w-full px-3 py-1 border-0 bg-gray-100 font-bold text-gray-800 focus:ring-0 focus:border-0 text-center"
                                                        placeholder="Nome da Divisão de Cena"
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeLinha(cena.id)} 
                                                        className="ml-4 text-red-600 hover:text-red-800 text-xs"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>
                                            </td>
                                        ) : (
                                            <>
                                                {/* Coluna Localização com Tags */}
                                                <td className="px-6 py-4 whitespace-normal align-top w-1/4">
                                                    <textarea
                                                        value={cena.localizacao || ''}
                                                        onChange={(e) => handleCenaChange(cena.id, 'localizacao', e.target.value)}
                                                        className="block w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 mb-2"
                                                        rows="2"
                                                        placeholder="Localização"
                                                    />
                                                    {/* Componente CreatableSelect para Tags */}
                                                    <div className="tag-selector-container">
                                                        <CreatableSelect
                                                            isMulti
                                                            isClearable
                                                            options={allTags}
                                                            value={cena.tags}
                                                            onChange={(selected) => handleCenaTagsChange(cena.id, selected)}
                                                            onCreateOption={handleCreateTag} // Função para criar nova tag
                                                            placeholder="Adicionar/Criar Tags..."
                                                            formatCreateLabel={(inputValue) => `Criar tag "${inputValue}"`}
                                                            styles={tagSelectStyles} // Aplicar estilos customizados
                                                            isLoading={loadingTags}
                                                            isDisabled={loadingTags}
                                                            classNamePrefix="react-select"
                                                        />
                                                    </div>
                                                </td>
                                                {/* Coluna Vídeo */}
                                                <td className="px-6 py-4 whitespace-normal align-top w-1/4">
                                                    <textarea 
                                                        value={cena.video || ''} 
                                                        onChange={(e) => handleCenaChange(cena.id, 'video', e.target.value)} 
                                                        className="block w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                        rows="3"
                                                    />
                                                </td>
                                                {/* Coluna Tec/Transição */}
                                                <td className="px-6 py-4 whitespace-normal align-top w-1/4">
                                                    <textarea 
                                                        value={cena.tec_transicao || ''} 
                                                        onChange={(e) => handleCenaChange(cena.id, 'tec_transicao', e.target.value)} 
                                                        className="block w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                        rows="3"
                                                    />
                                                </td>
                                                {/* Coluna Áudio */}
                                                <td className="px-6 py-4 whitespace-normal align-top w-1/4">
                                                    <textarea 
                                                        value={cena.audio || ''} 
                                                        onChange={(e) => handleCenaChange(cena.id, 'audio', e.target.value)} 
                                                        className="block w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                        rows="3"
                                                    />
                                                </td>
                                                {/* Coluna Ações */}
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium align-top">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeLinha(cena.id)} 
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Remover
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Botões Adicionar Linha / Divisão */} 
                <div className="flex items-center justify-start space-x-4 mb-6">
                    <button 
                        type="button" 
                        onClick={addLinha} 
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        + Adicionar Linha
                    </button>
                    <button 
                        type="button" 
                        onClick={addDivisaoCena} 
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        + Adicionar Divisão de Cena
                    </button>
                </div>

                {/* Botão Salvar */}
                <div className="flex items-center justify-end">
                    <button 
                        type="submit" 
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Roteiro')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RoteiroEditPage;

