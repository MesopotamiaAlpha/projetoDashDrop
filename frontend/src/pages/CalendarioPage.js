import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
// import { Calendar, dateFnsLocalizer } from 'react-big-calendar'; // Consider using a calendar library
// import format from 'date-fns/format';
// import parse from 'date-fns/parse';
// import startOfWeek from 'date-fns/startOfWeek';
// import getDay from 'date-fns/getDay';
// import 'react-big-calendar/lib/css/react-big-calendar.css';
// import { ptBR } from 'date-fns/locale'; // For Portuguese locale

// const localizer = dateFnsLocalizer({
//   format,
//   parse,
//   startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
//   getDay,
//   locales: { 'pt-BR': ptBR },
// });

const API_URL = process.env.REACT_APP_API_URL || "http://dropvideo.ddns.net:3001/api";

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

            {/* Listagem de Eventos (substituir por react-big-calendar para melhor UI) */}
            {loading ? (
                <p className="text-center text-gray-600">Carregando eventos...</p>
            ) : eventos.length === 0 ? (
                <p className="text-center text-gray-600">Nenhum evento encontrado com os filtros selecionados.</p>
            ) : (
                <div className="space-y-4">
                    {eventos.map(evento => (
                        <div key={evento.id} className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-gray-800">{evento.nome_gravacao}</h3>
                            <p className="text-sm text-gray-600">Data: {new Date(evento.data_evento).toLocaleDateString("pt-BR", {timeZone: "UTC"})}</p>
                            <p className="text-sm text-gray-600">Horário: {evento.horario_inicio.substring(0,5)} {evento.horario_fim ? `- ${evento.horario_fim.substring(0,5)}` : ""}</p>
                            {evento.tema && <p className="text-sm text-gray-600">Tema: {evento.tema}</p>}
                            {evento.apresentadores && evento.apresentadores.length > 0 && (
                                <p className="text-sm text-gray-600">Apresentador(es): {evento.apresentadores.map(ap => ap.nome_completo || ap.nome_usuario).join(", ")}</p>
                            )}
                            <div className="mt-3 flex space-x-2">
                                <button onClick={() => openModalForEdit(evento)} className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded">Editar</button>
                                <button onClick={() => handleDeleteEvento(evento.id)} className="text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded">Excluir</button>
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
                                <label className="block text-sm font-medium text-gray-700">Apresentador(es):</label>
                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                                    {allApresentadores.map(ap => (
                                        <div key={ap.id} className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                id={`ap-${ap.id}`} 
                                                value={ap.id}
                                                checked={apresentadorIds.includes(ap.id)}
                                                onChange={(e) => {
                                                    const id = parseInt(e.target.value);
                                                    setApresentadorIds(prev => 
                                                        e.target.checked ? [...prev, id] : prev.filter(pId => pId !== id)
                                                    );
                                                }}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`ap-${ap.id}`} className="ml-2 text-sm text-gray-700">{ap.nome_completo || ap.nome_usuario}</label>
                                        </div>
                                    ))}
                                    {allApresentadores.length === 0 && <p className="text-xs text-gray-500">Nenhum apresentador cadastrado ou com perfil de apresentador.</p>}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancelar</button>
                                <button type="submit" disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-green-300">
                                    {loading ? "Salvando..." : (currentEvento ? "Atualizar Evento" : "Criar Evento")}
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

