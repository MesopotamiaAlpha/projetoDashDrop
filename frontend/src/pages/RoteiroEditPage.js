import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
// import * as PIXI from 'pixi.js'; // Import PixiJS if animations are added here

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const RoteiroEditPage = () => {
    const { id: roteiroId } = useParams(); // For editing existing roteiro
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [nome, setNome] = useState('');
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [dataCriacaoDocumento, setDataCriacaoDocumento] = useState(new Date().toISOString().split('T')[0]);
    const [tags, setTags] = useState([]); // Array of selected tag IDs
    const [allTags, setAllTags] = useState([]); // All available tags from API
    const [cenas, setCenas] = useState([
        // Default scene structure
        { video: '', tec_transicao: '', audio: '', estilo_linha_json: {}, colunas_personalizadas_json: {} }
    ]);
    const [logoEmpresaUrl, setLogoEmpresaUrl] = useState(''); // From user settings or a default
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const isEditing = Boolean(roteiroId);

    const fetchRoteiroData = useCallback(async () => {
        if (!isEditing || !currentUser) return;
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/roteiros/${roteiroId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            const roteiro = response.data;
            setNome(roteiro.nome);
            setAno(roteiro.ano);
            setMes(roteiro.mes);
            setDataCriacaoDocumento(roteiro.dataCriacaoDocumento ? new Date(roteiro.dataCriacaoDocumento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setTags(roteiro.tags ? roteiro.tags.map(t => t.id) : []);
            
            // Fetch cenas for this roteiro
            const cenasResponse = await axios.get(`${API_URL}/roteiros/${roteiroId}/cenas`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setCenas(cenasResponse.data.length > 0 ? cenasResponse.data.map(c => ({...c, estilo_linha_json: c.estilo_linha_json || {}, colunas_personalizadas_json: c.colunas_personalizadas_json || {}})) : [{ video: '', tec_transicao: '', audio: '', estilo_linha_json: {}, colunas_personalizadas_json: {} }]);

        } catch (err) {
            console.error("Erro ao buscar dados do roteiro:", err);
            setError('Falha ao carregar dados do roteiro.');
        }
        setLoading(false);
    }, [isEditing, roteiroId, currentUser]);

    const fetchAllTags = useCallback(async () => {
        if (!currentUser) return;
        try {
            const response = await axios.get(`${API_URL}/tags`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setAllTags(response.data);
        } catch (err) {
            console.error("Erro ao buscar todas as tags:", err);
        }
    }, [currentUser]);
    
    const fetchUserLogo = useCallback(async () => {
        if (!currentUser || !currentUser.id) return;
        try {
            // Assuming the user's profile contains the logo path
            // This might need adjustment based on how logo_empresa_path is stored and served
            const userProfileResponse = await axios.get(`${API_URL}/users/me`, { // or /users/${currentUser.id}
                 headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (userProfileResponse.data.logo_empresa_path) {
                // If logo_empresa_path is a full URL, use it directly.
                // If it's a relative path, prepend the API base URL or static server URL.
                // For now, assuming it's a path that needs to be appended to API_URL if not absolute.
                let logoPath = userProfileResponse.data.logo_empresa_path;
                if (!logoPath.startsWith('http')) {
                    // This is a placeholder. The actual URL construction depends on how files are served.
                    // It might be `${API_URL}/uploads/${logoPath}` or similar.
                    // For simplicity, if it's just a filename, we might not be able to display it directly without a proper static serving setup.
                    // Let's assume for now it's a full URL or can be resolved by the browser if relative to the API.
                    // If it's stored as a full URL in the DB, this is fine.
                    // If it's a relative path like 'uploads/logo.png', and your API serves static files from '/uploads', then it would be `${API_URL}/${logoPath}`.
                    // This needs to be configured correctly based on your backend file serving strategy.
                    // For this example, let's assume it's a full URL or a path the backend can resolve if the frontend requests it via an image tag src.
                    // A common pattern is to have a dedicated endpoint like /api/users/me/logo that returns the image file.
                    // For now, we'll just set it and hope the browser can resolve it or it's a full URL.
                    // A better approach: store full URLs or have a dedicated endpoint.
                    // If the backend stores 'my_logo.png' and serves it from '/public/logos/my_logo.png'
                    // then logoEmpresaUrl should be 'http://localhost:3001/public/logos/my_logo.png'
                    // For now, let's assume `logo_empresa_path` is a full URL or a path that the API serves directly.
                    // If it's just a filename, this won't work without a static file server setup on the backend
                    // and the frontend knowing the base URL for those static files.
                    // Let's assume it's a full URL for now for simplicity in this example.
                    // If not, this part needs to be adapted to how logos are actually served.
                }
                 setLogoEmpresaUrl(userProfileResponse.data.logo_empresa_path);
            }
        } catch (err) {
            console.error("Erro ao buscar logo da empresa:", err);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchAllTags();
        fetchUserLogo();
        if (isEditing) {
            fetchRoteiroData();
        } else {
            // Set default date for new roteiro
            setDataCriacaoDocumento(new Date().toISOString().split('T')[0]);
            setAno(new Date().getFullYear());
            setMes(new Date().getMonth() + 1);
        }
    }, [isEditing, fetchRoteiroData, fetchAllTags, fetchUserLogo]);

    const handleCenaChange = (index, field, value) => {
        const newCenas = [...cenas];
        if (field === 'estilo_linha_json' || field === 'colunas_personalizadas_json') {
            newCenas[index][field] = { ...newCenas[index][field], ...value };
        } else {
            // Convert all text to uppercase as per requirement
            newCenas[index][field] = typeof value === 'string' ? value.toUpperCase() : value;
        }
        setCenas(newCenas);
    };

    const addCena = () => {
        setCenas([...cenas, { video: '', tec_transicao: '', audio: '', estilo_linha_json: {}, colunas_personalizadas_json: {} }]);
    };

    const removeCena = (index) => {
        if (cenas.length <= 1) return; // Keep at least one cena
        const newCenas = cenas.filter((_, i) => i !== index);
        setCenas(newCenas);
    };
    
    const handleAddCustomColumn = (cenaIndex, columnName) => {
        if (!columnName) return;
        const newCenas = [...cenas];
        const currentCustomCols = newCenas[cenaIndex].colunas_personalizadas_json || {};
        if (!currentCustomCols[columnName.toUpperCase()]) { // Avoid duplicate column names (case insensitive for creation)
            newCenas[cenaIndex].colunas_personalizadas_json = {
                ...currentCustomCols,
                [columnName.toUpperCase()]: '' // Initialize with empty value
            };
            setCenas(newCenas);
        }
    };

    const handleCustomColumnChange = (cenaIndex, columnName, value) => {
        const newCenas = [...cenas];
        newCenas[cenaIndex].colunas_personalizadas_json[columnName] = value.toUpperCase();
        setCenas(newCenas);
    };
    
    const handleRemoveCustomColumn = (cenaIndex, columnName) => {
        const newCenas = [...cenas];
        delete newCenas[cenaIndex].colunas_personalizadas_json[columnName];
        setCenas(newCenas);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        const roteiroDataPayload = {
            nome,
            ano: parseInt(ano),
            mes: parseInt(mes),
            dataCriacaoDocumento,
            tags, // Array of tag IDs
            // conteudo_principal: "Optional field if you have it in your form"
        };

        try {
            let response;
            if (isEditing) {
                response = await axios.put(`${API_URL}/roteiros/${roteiroId}`, roteiroDataPayload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
                // Update cenas - this might need a batch update endpoint or individual updates
                // For simplicity, let's assume cenas are updated separately or as part of the roteiro update if API supports it.
                // The current backend controller for roteiro update does not handle cenas directly.
                // Cenas need to be managed via /roteiros/:roteiroId/cenas endpoints.
                // This means after updating the roteiro, we might need to update/create/delete cenas.
                
                // Simplified: delete all existing cenas and add new ones (not ideal for performance/IDs)
                // A better approach: diff and update/create/delete selectively.
                // For now, let's assume the user manages cenas and saves them. The save here is for the roteiro metadata.
                // If the backend's PUT /roteiros/:id also handles cenas, this is simpler.
                // Let's assume we need to manage cenas separately.
                // 1. Update Roteiro Metadata
                // 2. Manage Cenas (Create/Update/Delete)
                // For this example, we'll focus on saving the roteiro metadata. Cena management would be more complex.
                // Let's assume the backend handles cenas if they are part of the payload, or we make separate calls.
                // The current backend `updateRoteiro` does not take cenas. Cenas are managed via their own endpoints.
                // So, after saving the roteiro, we need to save the cenas.
                // This part needs careful implementation based on API design.

                // Let's try to update cenas one by one (or batch if API supports)
                // This is a common pattern: first save/update the parent, then children.
                for (let i = 0; i < cenas.length; i++) {
                    const cena = cenas[i];
                    const cenaPayload = {
                        ...cena,
                        ordem: i, // Ensure order is maintained
                        estilo_linha_json: JSON.stringify(cena.estilo_linha_json || {}),
                        colunas_personalizadas_json: JSON.stringify(cena.colunas_personalizadas_json || {})
                    };
                    if (cena.id) { // Existing cena, update it
                        await axios.put(`${API_URL}/roteiros/${roteiroId}/cenas/${cena.id}`, cenaPayload, {
                             headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                        });
                    } else { // New cena, create it
                        await axios.post(`${API_URL}/roteiros/${roteiroId}/cenas`, cenaPayload, {
                             headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                        });
                    }
                }
                // Handle deleted cenas if any (not implemented here for brevity, would require tracking original cenas)

            } else {
                response = await axios.post(`${API_URL}/roteiros`, roteiroDataPayload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                });
                const newRoteiroId = response.data.roteiroId;
                // Now save cenas for the new roteiro
                for (let i = 0; i < cenas.length; i++) {
                    const cena = cenas[i];
                    const cenaPayload = {
                        ...cena,
                        ordem: i,
                        estilo_linha_json: JSON.stringify(cena.estilo_linha_json || {}),
                        colunas_personalizadas_json: JSON.stringify(cena.colunas_personalizadas_json || {})
                    };
                    await axios.post(`${API_URL}/roteiros/${newRoteiroId}/cenas`, cenaPayload, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
                    });
                }
                if (!isEditing) {
                    navigate(`/roteiros/editar/${newRoteiroId}`); // Navigate to edit mode after creation
                }
            }
            setSuccessMessage(`Roteiro ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            fetchRoteiroData(); // Refresh data
        } catch (err) {
            console.error("Erro ao salvar roteiro:", err.response ? err.response.data : err);
            setError(err.response?.data?.message || `Falha ao salvar roteiro.`);
        }
        setLoading(false);
    };
    
    const handleGeneratePdf = () => {
        // PDF generation logic using jsPDF or WeasyPrint (via backend)
        // This is a placeholder. Actual implementation will depend on the chosen library and complexity.
        alert("Funcionalidade de Gerar PDF para este roteiro ainda não implementada.");
        // Example with jsPDF (very basic):
        // const doc = new jsPDF();
        // doc.text(`Roteiro: ${nome}`, 10, 10);
        // cenas.forEach((cena, index) => {
        //     doc.text(`Cena ${index + 1}: ${cena.video} | ${cena.audio}`, 10, 20 + (index * 10));
        // });
        // doc.save(`${nome.replace(/\s+/g, '_')}_roteiro.pdf`);
    };

    if (loading && isEditing && !nome) { // Initial load for edit page
        return <p className="text-center text-gray-600 mt-10">Carregando dados do roteiro...</p>;
    }

    // Helper for styling
    const getCellStyle = (styleJson) => {
        const styles = {};
        if (styleJson?.cor_fundo) styles.backgroundColor = styleJson.cor_fundo;
        if (styleJson?.cor_fonte) styles.color = styleJson.cor_fonte;
        if (styleJson?.altura_personalizada) styles.height = styleJson.altura_personalizada;
        // Text alignment is global: text-center
        // Bold is per-field, not per-row style
        return styles;
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">
                    {isEditing ? `Editar Roteiro: ${nome}` : 'Criar Novo Roteiro'}
                </h1>
                <Link to="/roteiros" className="text-blue-600 hover:text-blue-800">&larr; Voltar para Roteiros</Link>
            </div>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
            {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded mb-4">{successMessage}</p>}

            {/* Formulário de Metadados do Roteiro */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome do Roteiro:</label>
                        <input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required 
                               className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="ano" className="block text-sm font-medium text-gray-700">Ano:</label>
                        <input type="number" id="ano" value={ano} onChange={(e) => setAno(parseInt(e.target.value))} required 
                               className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="mes" className="block text-sm font-medium text-gray-700">Mês:</label>
                        <select id="mes" value={mes} onChange={(e) => setMes(parseInt(e.target.value))} required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0,m-1).toLocaleString('pt-BR', {month: 'long'})}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="dataCriacaoDocumento" className="block text-sm font-medium text-gray-700">Data de Criação do Documento:</label>
                    <input type="date" id="dataCriacaoDocumento" value={dataCriacaoDocumento} onChange={(e) => setDataCriacaoDocumento(e.target.value)} 
                           className="mt-1 block w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags:</label>
                    <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => (
                            <button 
                                type="button"
                                key={tag.id} 
                                onClick={() => setTags(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                                style={{ backgroundColor: tags.includes(tag.id) ? tag.cor : '#E5E7EB', color: tags.includes(tag.id) ? 'white' : 'black'}}
                                className={`px-3 py-1 rounded-full text-sm font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500`}
                            >
                                {tag.nome}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end space-x-3">
                    <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-green-300">
                        {loading ? 'Salvando...' : (isEditing ? 'Atualizar Roteiro' : 'Criar Roteiro')}
                    </button>
                    <button type="button" onClick={handleGeneratePdf} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Gerar PDF (Espelho)
                    </button>
                </div>
            </form>

            {/* Editor de Cenas */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-semibold text-gray-700">Cenas do Roteiro</h2>
                     {logoEmpresaUrl && <img src={logoEmpresaUrl} alt="Logo da Empresa" className="max-h-12 object-contain" />}
                </div>
                <p className="text-sm text-gray-500 mb-1">Nome do Roteiro: {nome || "(não definido)"}</p>
                <p className="text-sm text-gray-500 mb-4">Data: {dataCriacaoDocumento ? new Date(dataCriacaoDocumento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : "N/A"} | Páginas: {Math.ceil(cenas.length / 5)} (estimado)</p>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 w-10">#</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Vídeo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Tec/Transição</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Áudio</th>
                                {cenas.length > 0 && Object.keys(cenas[0].colunas_personalizadas_json || {}).map(colName => (
                                    <th key={colName} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-300">
                                        {colName}
                                        <button onClick={() => handleRemoveCustomColumn(0, colName)} className="ml-2 text-red-500 hover:text-red-700 text-xs">(Remover Coluna)</button>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-300 w-20">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {cenas.map((cena, index) => (
                                <tr key={index} style={getCellStyle(cena.estilo_linha_json)} className="text-center align-top">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-300 align-middle">{index + 1}</td>
                                    <td className="border-r border-gray-300 p-0 align-top">
                                        <textarea value={cena.video} onChange={(e) => handleCenaChange(index, 'video', e.target.value)} 
                                                  className="w-full h-24 p-2 border-none focus:ring-0 resize-y text-sm uppercase text-center" placeholder="Descrição do vídeo..."></textarea>
                                    </td>
                                    <td className="border-r border-gray-300 p-0 align-top">
                                        <textarea value={cena.tec_transicao} onChange={(e) => handleCenaChange(index, 'tec_transicao', e.target.value)} 
                                                  className="w-full h-24 p-2 border-none focus:ring-0 resize-y text-sm uppercase text-center" placeholder="Técnica ou transição..."></textarea>
                                    </td>
                                    <td className="p-0 align-top">
                                        <textarea value={cena.audio} onChange={(e) => handleCenaChange(index, 'audio', e.target.value)} 
                                                  className="w-full h-24 p-2 border-none focus:ring-0 resize-y text-sm uppercase text-center" placeholder="Texto do áudio..."></textarea>
                                    </td>
                                    {Object.entries(cena.colunas_personalizadas_json || {}).map(([colName, colValue]) => (
                                        <td key={colName} className="border-l border-gray-300 p-0 align-top">
                                            <textarea value={colValue} onChange={(e) => handleCustomColumnChange(index, colName, e.target.value)} 
                                                      className="w-full h-24 p-2 border-none focus:ring-0 resize-y text-sm uppercase text-center" placeholder={`Conteúdo ${colName}...`}></textarea>
                                        </td>
                                    ))}
                                    <td className="px-2 py-2 whitespace-nowrap text-sm font-medium border-l border-gray-300 align-middle">
                                        <button onClick={() => removeCena(index)} disabled={cenas.length <=1} className="text-red-600 hover:text-red-900 disabled:text-gray-400 mb-1 w-full text-xs">Remover Cena</button>
                                        <input type="color" title="Cor da Fonte" value={cena.estilo_linha_json?.cor_fonte || '#000000'} onChange={(e) => handleCenaChange(index, 'estilo_linha_json', {cor_fonte: e.target.value})} className="w-full h-6 mb-1"/>
                                        <input type="color" title="Cor do Fundo" value={cena.estilo_linha_json?.cor_fundo || '#FFFFFF'} onChange={(e) => handleCenaChange(index, 'estilo_linha_json', {cor_fundo: e.target.value})} className="w-full h-6 mb-1"/>
                                        <input type="text" title="Altura da Linha (ex: 100px)" placeholder="Altura (px)" value={cena.estilo_linha_json?.altura_personalizada || ''} onChange={(e) => handleCenaChange(index, 'estilo_linha_json', {altura_personalizada: e.target.value})} className="w-full text-xs p-1 border border-gray-300 rounded"/>
                                        {/* Bold per field can be added with a WYSIWYG or markdown support, complex for simple textarea */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex justify-between">
                    <button onClick={addCena} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm">
                        Adicionar Nova Cena
                    </button>
                    <div>
                        <input type="text" id="newCustomColumnName" placeholder="Nome da Nova Coluna" className="p-2 border border-gray-300 rounded-l text-sm"/>
                        <button onClick={() => handleAddCustomColumn(0, document.getElementById('newCustomColumnName').value)} className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-r text-sm">
                            Criar Coluna Personalizada
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoteiroEditPage;

