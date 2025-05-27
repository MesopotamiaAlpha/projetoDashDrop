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
    const [eventoNome, setEventoNome] = useState('');
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
            
            // Se tiver evento_id, buscar o nome do evento
            if (roteiro.evento_id) {
                try {
                    const eventoResponse = await axios.get(`${API_URL}/calendario/eventos/${roteiro.evento_id}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    });
                    if (eventoResponse.data && eventoResponse.data.nome_gravacao) {
                        setEventoNome(eventoResponse.data.nome_gravacao);
                    }
                } catch (eventoErr) {
                    console.error("Erro ao buscar detalhes do evento:", eventoErr);
                }
            }

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

    // Handle evento selection change
    const handleEventoChange = (e) => {
        const selectedEventoId = e.target.value;
        setEventoId(selectedEventoId);
        
        // Atualizar o nome do evento selecionado
        if (selectedEventoId) {
            const selectedEvento = eventos.find(evento => evento.id.toString() === selectedEventoId);
            if (selectedEvento) {
                setEventoNome(selectedEvento.nome);
            } else {
                setEventoNome('');
            }
        } else {
            setEventoNome('');
        }
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

    // Generate PDF function
    const handleGeneratePdf = async () => {
        if (!roteiroId) {
            setError("Salve o roteiro antes de gerar o PDF.");
            return;
        }
        setLoading(true);
        setError('');
        try {
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
        
        // Clone the table to modify for printing
        const tableClone = printArea.querySelector('table').cloneNode(true);
        
        // Remove tag elements from the clone
        tableClone.querySelectorAll('.tag-selector-container').forEach(el => el.remove());
        
        // Remover a coluna de Ações completamente
        const headerRow = tableClone.querySelector('thead tr');
        if (headerRow && headerRow.lastElementChild) {
            headerRow.removeChild(headerRow.lastElementChild); // Remove a última coluna (Ações)
        }
        
        // Remover a coluna de Ações de cada linha
        tableClone.querySelectorAll('tbody tr').forEach(row => {
            if (row.lastElementChild && !row.hasAttribute('data-divisoria')) {
                row.removeChild(row.lastElementChild); // Remove a última coluna (Ações)
            }
        });
        
        // Criar estilos CSS para impressão com as novas especificações
        const printStyles = `
            <style>
                @media print {
                    body { 
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .print-title {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .print-subtitle {
                        font-size: 16px;
                        color: #555;
                        margin-bottom: 15px;
                    }
                    .print-info {
                        font-size: 14px;
                        margin-bottom: 20px;
                        display: flex;
                        justify-content: space-between;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th {
                        background-color: #ffffff !important; /* Cabeçalho branco */
                        padding: 10px;
                        text-align: center;
                        font-weight: bold;
                        border: 1px solid #ddd;
                    }
                    td {
                        padding: 8px;
                        border: 0.5px solid #eee; /* Bordas sutis/transparentes */
                        vertical-align: top;
                    }
                    .divisoria {
                        background-color: #f2f2f2 !important; /* Cinza claro para divisões de cena */
                        font-weight: bold;
                        text-align: center;
                        padding: 8px;
                    }
                    .page-break {
                        page-break-after: always;
                    }
                    .tag-display {
                        display: inline-block;
                        padding: 2px 6px;
                        margin: 2px;
                        border-radius: 4px;
                        font-size: 12px;
                    }
                }
            </style>
        `;
        
        // Criar cabeçalho para impressão
        const printHeader = `
            <div class="print-header">
                <div class="print-title">${nome || 'Roteiro'}</div>
                ${eventoNome ? `<div class="print-subtitle">Gravação: ${eventoNome}</div>` : ''}
                <div class="print-info">
                    <span>Tipo: ${tipoRoteiro || 'N/A'}</span>
                    <span>Data: ${new Date(dataCriacaoDocumento).toLocaleDateString('pt-BR')}</span>
                    <span>Ano/Mês: ${ano}/${mes}</span>
                </div>
            </div>
        `;
        
        // Montar conteúdo completo para impressão
        const printContents = `
            <html>
            <head>
                <title>${nome || 'Roteiro'}</title>
                ${printStyles}
            </head>
            <body>
                ${printHeader}
                ${tableClone.outerHTML}
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContents);
        printWindow.document.close();
        printWindow.focus();
        
        // Pequeno atraso para garantir que os estilos sejam aplicados
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    if (loading && isEditing && !nome) {
        return <p className="text-center text-gray-600 mt-10">Carregando dados do roteiro...</p>;
    }

    return (
        <div className="container mx-auto p-4">
            {/* Header com design melhorado */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-800">{isEditing ? 'Editar Roteiro' : 'Novo Roteiro'}</h1>
                    {/* Botões */}
                    <div className="flex space-x-2">
                        {isEditing && (
                            <>
                                <button 
                                    onClick={handleGeneratePdf}
                                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out flex items-center"
                                    disabled={loading}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                                    </svg>
                                    {loading ? 'Gerando...' : 'Gerar PDF'}
                                </button>
                                <button 
                                    onClick={handlePrint}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out flex items-center"
                                    disabled={loading}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                                    </svg>
                                    Imprimir
                                </button>
                            </>
                        )}
                        <Link to="/roteiros" className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Voltar
                        </Link>
                    </div>
                </div>

                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                    <p>{error}</p>
                </div>}
                
                {successMessage && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md" role="alert">
                    <p>{successMessage}</p>
                </div>}
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
                {/* Campos de informações do roteiro com layout melhorado */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Informações do Roteiro</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-purple-500"
                                required 
                                placeholder="Digite o nome do roteiro"
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
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-purple-500"
                                placeholder="Ex: PROGRAMA AO VIVO, PODCAST"
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
                                onChange={handleEventoChange}
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-purple-500"
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
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-purple-500"
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
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-purple-500"
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
                                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-purple-500"
                                required 
                            />
                        </div>
                    </div>
                </div>

                {/* Tabela de Edição do Roteiro com design melhorado */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Conteúdo do Roteiro</h2>
                    <div id="roteiro-print-area" className="mb-6">
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-purple-500 to-purple-700">
                                    <tr>
                                        {/* Cabeçalho Centralizado */}
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider rounded-tl-lg">Localização / Tags</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Vídeo</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Tec / Transição</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Áudio</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider rounded-tr-lg">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {cenas.map((cena) => (
                                        <tr key={cena.id} className={cena.type === 'divisoria' ? 'bg-gray-100' : ''} data-divisoria={cena.type === 'divisoria' ? 'true' : 'false'}>
                                            {cena.type === 'divisoria' ? (
                                                <td colSpan="5" className="px-6 py-3 whitespace-nowrap divisoria">
                                                    <div className="flex items-center justify-between">
                                                        <input 
                                                            type="text" 
                                                            value={cena.nomeDivisao || ''} 
                                                            onChange={(e) => handleCenaChange(cena.id, 'nomeDivisao', e.target.value)} 
                                                            className="block w-full px-3 py-2 border-0 bg-gray-100 font-bold text-gray-800 focus:ring-0 focus:border-0 text-center text-lg"
                                                            placeholder="Nome da Divisão de Cena"
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeLinha(cena.id)} 
                                                            className="ml-4 text-red-600 hover:text-red-800 text-xs bg-white hover:bg-red-100 p-1 rounded-full"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
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
                                                            className="block w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-2 resize-none"
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
                                                            className="block w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                                            rows="4"
                                                            placeholder="Descrição do vídeo"
                                                        />
                                                    </td>
                                                    {/* Coluna Tec/Transição */}
                                                    <td className="px-6 py-4 whitespace-normal align-top w-1/4">
                                                        <textarea 
                                                            value={cena.tec_transicao || ''} 
                                                            onChange={(e) => handleCenaChange(cena.id, 'tec_transicao', e.target.value)} 
                                                            className="block w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                                            rows="4"
                                                            placeholder="Informações técnicas e transições"
                                                        />
                                                    </td>
                                                    {/* Coluna Áudio */}
                                                    <td className="px-6 py-4 whitespace-normal align-top w-1/4">
                                                        <textarea 
                                                            value={cena.audio || ''} 
                                                            onChange={(e) => handleCenaChange(cena.id, 'audio', e.target.value)} 
                                                            className="block w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                                            rows="4"
                                                            placeholder="Descrição do áudio"
                                                        />
                                                    </td>
                                                    {/* Coluna Ações */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium align-top">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeLinha(cena.id)} 
                                                            className="text-white bg-red-500 hover:bg-red-600 rounded-full p-2 transition duration-150 ease-in-out"
                                                            title="Remover linha"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
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
                </div>

                {/* Botões Adicionar Linha / Divisão com design melhorado */} 
                <div className="flex items-center justify-start space-x-4 mb-6">
                    <button 
                        type="button" 
                        onClick={addLinha} 
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Adicionar Linha
                    </button>
                    <button 
                        type="button" 
                        onClick={addDivisaoCena} 
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                        </svg>
                        Adicionar Divisão de Cena
                    </button>
                </div>

                {/* Botão Salvar com design melhorado */}
                <div className="flex items-center justify-end">
                    <button 
                        type="submit" 
                        className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold py-3 px-8 rounded-lg transition duration-150 ease-in-out shadow-md flex items-center"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {isEditing ? 'Salvar Alterações' : 'Criar Roteiro'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RoteiroEditPage;
