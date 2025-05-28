import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import "./CalendarioPage.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

const CalendarioPage = () => {
    const { currentUser } = useAuth();
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // State for new/editing event
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEvento, setCurrentEvento] = useState(null); // null for new, object for editing
    const [nomeGravacao, setNomeGravacao] = useState("");
    const [dataEvento, setDataEvento] = useState(new Date().toISOString().split("T")[0]);
    const [horarioInicio, setHorarioInicio] = useState("09:00");
    const [horarioFim, setHorarioFim] = useState("10:00");
    const [tema, setTema] = useState("");
    const [apresentadorIds, setApresentadorIds] = useState([]); // Array of selected presenter IDs
    const [allApresentadores, setAllApresentadores] = useState([]); // Users with perfil_apresentador = true
    const [corEvento, setCorEvento] = useState("");

    // Cores disponíveis para seleção
    const coresDisponiveis = [
        "#4285F4", // Azul
        "#EA4335", // Vermelho
        "#FBBC05", // Amarelo
        "#34A853", // Verde
        "#8E24AA", // Roxo
        "#16A2D7", // Azul claro
        "#FF6D00", // Laranja
        "#2E7D32", // Verde escuro
        "#6200EA", // Índigo
        "#C2185B", // Rosa escuro
        "#00ACC1", // Ciano
        "#F4511E", // Laranja escuro
        "#43A047", // Verde médio
        "#6D4C41", // Marrom
        "#AB47BC", // Roxo médio
        "#EC407A", // Rosa
        "#7CB342", // Verde limão
        "#5C6BC0"  // Azul índigo
    ];

    // Filters
    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroApresentador, setFiltroApresentador] = useState("");
    const [filtroTema, setFiltroTema] = useState("");
    const [availableYears, setAvailableYears] = useState([]);

    const fetchEventos = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        setError("");
        try {
            const params = {};
            if (filtroAno) params.ano = filtroAno;
            if (filtroMes) params.mes = filtroMes;
            if (filtroApresentador) params.apresentadorId = filtroApresentador;
            if (filtroTema) params.tema = filtroTema;

            const response = await axios.get(`${API_URL}/calendario/eventos`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
                params,
            });
            setEventos(response.data.map(ev => ({ // Transform for react-big-calendar if used
                ...ev,
                title: ev.nome_gravacao,
                start: new Date(`${ev.data_evento}T${ev.horario_inicio}`),
                end: ev.horario_fim ? new Date(`${ev.data_evento}T${ev.horario_fim}`) : new Date(`${ev.data_evento}T${ev.horario_inicio}`),
            })));
        } catch (err) {
            console.error("Erro ao buscar eventos do calendário:", err);
            setError("Falha ao carregar eventos. Tente novamente mais tarde.");
        }
        setLoading(false);
    }, [currentUser, filtroAno, filtroMes, filtroApresentador, filtroTema]);

    const fetchApresentadores = useCallback(async () => {
        if (!currentUser) return;
        try {
            const response = await axios.get(`${API_URL}/users`, { // Assuming /users returns all users
                headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
            });
            setAllApresentadores(response.data.filter(user => user.perfil_apresentador));
        } catch (err) {
            console.error("Erro ao buscar apresentadores:", err);
        }
    }, [currentUser]);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear + 2; i >= currentYear - 5; i--) {
            years.push(i);
        }
        setAvailableYears(years);
        fetchApresentadores();
    }, [fetchApresentadores]);

    useEffect(() => {
        fetchEventos();
    }, [fetchEventos]);

    const openModalForNew = () => {
        setCurrentEvento(null);
        setNomeGravacao("");
        setDataEvento(new Date().toISOString().split("T")[0]);
        setHorarioInicio("09:00");
        setHorarioFim("10:00");
        setTema("");
        setApresentadorIds([]);
        setCorEvento(coresDisponiveis[Math.floor(Math.random() * coresDisponiveis.length)]);
        setIsModalOpen(true);
    };

    const openModalForEdit = (evento) => {
        setCurrentEvento(evento);
        setNomeGravacao(evento.nome_gravacao);
        setDataEvento(new Date(evento.data_evento).toISOString().split("T")[0]);
        setHorarioInicio(evento.horario_inicio.substring(0,5));
        setHorarioFim(evento.horario_fim ? evento.horario_fim.substring(0,5) : "");
        setTema(evento.tema || "");
        setApresentadorIds(evento.apresentadores ? evento.apresentadores.map(ap => ap.id) : []);
        setCorEvento(evento.cor || coresDisponiveis[Math.floor(Math.random() * coresDisponiveis.length)]);
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const payload = {
            nome_gravacao: nomeGravacao,
            data_evento: dataEvento,
            horario_inicio: horarioInicio,
            horario_fim: horarioFim || null, // API expects null if empty
            tema,
            apresentador_ids: apresentadorIds,
            cor: corEvento
        };

        try {
            if (currentEvento && currentEvento.id) {
                await axios.put(`${API_URL}/calendario/eventos/${currentEvento.id}`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
                });
            } else {
                await axios.post(`${API_URL}/calendario/eventos`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
                });
            }
            setIsModalOpen(false);
            fetchEventos(); // Refresh list
        } catch (err) {
            console.error("Erro ao salvar evento:", err.response ? err.response.data : err);
            setError(err.response?.data?.message || "Falha ao salvar evento.");
        }
        setLoading(false);
    };
    
    const handleDeleteEvento = async (eventoId) => {
        if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;
        try {
            await axios.delete(`${API_URL}/calendario/eventos/${eventoId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
            });
            fetchEventos(); // Refresh list
        } catch (err) {
            console.error("Erro ao excluir evento:", err);
            setError(err.response?.data?.message || "Falha ao excluir evento.");
        }
    };

    // Basic list rendering for now. react-big-calendar would be better for UI.
    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Calendário de Gravações</h1>
                <button 
                    onClick={openModalForNew}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                >
                    Agendar Nova Gravação
                </button>
            </div>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label htmlFor="filtroAnoCal" className="block text-sm font-medium text-gray-700">Ano:</label>
                    <select id="filtroAnoCal" value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="filtroMesCal" className="block text-sm font-medium text-gray-700">Mês:</label>
                    <select id="filtroMesCal" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Todos</option>
                        {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                            <option key={month} value={month}>{new Date(0, month-1).toLocaleString("pt-BR", { month: "long" })}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="filtroApresentadorCal" className="block text-sm font-medium text-gray-700">Apresentador(a):</label>
                    <select id="filtroApresentadorCal" value={filtroApresentador} onChange={(e) => setFiltroApresentador(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Todos</option>
                        {allApresentadores.map(ap => <option key={ap.id} value={ap.id}>{ap.nome_completo || ap.nome_usuario}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="filtroTemaCal" className="block text-sm font-medium text-gray-700">Tema:</label>
                    <input type="text" id="filtroTemaCal" value={filtroTema} onChange={(e) => setFiltroTema(e.target.value)} placeholder="Filtrar por tema..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>
                <button onClick={fetchEventos} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out self-end">Filtrar</button>
            </div>

            {/* Listagem de Eventos como Cards Coloridos */}
            {loading ? (
                <p className="text-center text-gray-600">Carregando eventos...</p>
            ) : eventos.length === 0 ? (
                <p className="text-center text-gray-600">Nenhum evento encontrado com os filtros selecionados.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {eventos.map(evento => (
                        <div 
                            key={evento.id} 
                            className="evento-card rounded-lg shadow-md overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-1"
                            style={{
                                borderLeft: `5px solid ${evento.cor || '#4285F4'}`,
                                backgroundColor: `${evento.cor || '#4285F4'}10`
                            }}
                        >
                            <div className="p-4">
                                <h3 className="text-lg font-semibold text-gray-800">{evento.nome_gravacao}</h3>
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-600 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        {new Date(evento.data_evento).toLocaleDateString("pt-BR", {timeZone: "UTC"})}
                                    </p>
                                    <p className="text-sm text-gray-600 flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        {evento.horario_inicio.substring(0,5)} {evento.horario_fim ? `- ${evento.horario_fim.substring(0,5)}` : ""}
                                    </p>
                                    {evento.tema && (
                                        <p className="text-sm text-gray-600 flex items-center">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                                            </svg>
                                            {evento.tema}
                                        </p>
                                    )}
                                    {evento.apresentadores && evento.apresentadores.length > 0 && (
                                        <p className="text-sm text-gray-600 flex items-center">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                            </svg>
                                            {evento.apresentadores.map(ap => ap.nome_completo || ap.nome_usuario).join(", ")}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 flex space-x-2 justify-end">
                                    <button 
                                        onClick={() => openModalForEdit(evento)} 
                                        className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded transition-colors duration-150"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteEvento(evento.id)} 
                                        className="text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded transition-colors duration-150"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal para Adicionar/Editar Evento */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">{currentEvento ? "Editar Evento" : "Agendar Nova Gravação"}</h2>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="nomeGravacaoModal" className="block text-sm font-medium text-gray-700">Nome da Gravação:</label>
                                <input type="text" id="nomeGravacaoModal" value={nomeGravacao} onChange={(e) => setNomeGravacao(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="dataEventoModal" className="block text-sm font-medium text-gray-700">Data:</label>
                                    <input type="date" id="dataEventoModal" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="horarioInicioModal" className="block text-sm font-medium text-gray-700">Horário Início:</label>
                                    <input type="time" id="horarioInicioModal" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="horarioFimModal" className="block text-sm font-medium text-gray-700">Horário Fim (opcional):</label>
                                <input type="time" id="horarioFimModal" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="temaModal" className="block text-sm font-medium text-gray-700">Tema:</label>
                                <input type="text" id="temaModal" value={tema} onChange={(e) => setTema(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cor do Evento:</label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {coresDisponiveis.map((cor, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            className={`w-8 h-8 rounded-full border-2 ${corEvento === cor ? 'border-gray-800' : 'border-transparent'}`}
                                            style={{ backgroundColor: cor }}
                                            onClick={() => setCorEvento(cor)}
                                            aria-label={`Selecionar cor ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Apresentador(es):</label>
                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                                    {allApresentadores.map(ap => (
                                        <div key={ap.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`apresentador-${ap.id}`}
                                                checked={apresentadorIds.includes(ap.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setApresentadorIds([...apresentadorIds, ap.id]);
                                                    } else {
                                                        setApresentadorIds(apresentadorIds.filter(id => id !== ap.id));
                                                    }
                                                }}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`apresentador-${ap.id}`} className="ml-2 block text-sm text-gray-900">
                                                {ap.nome_completo || ap.nome_usuario}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors duration-150">Cancelar</button>
                                <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-150 disabled:bg-green-300">
                                    {loading ? 'Salvando...' : (currentEvento ? 'Atualizar Evento' : 'Agendar Gravação')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarioPage;
