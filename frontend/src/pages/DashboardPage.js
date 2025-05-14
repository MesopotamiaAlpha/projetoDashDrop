import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://dropvideo.ddns.net:3001/api';

const DashboardPage = () => {
    const { currentUser } = useAuth();
    const [proximosEventos, setProximosEventos] = useState([]);
    const [loadingEventos, setLoadingEventos] = useState(true);
    const [errorEventos, setErrorEventos] = useState('');

    useEffect(() => {
        const fetchProximosEventos = async () => {
            if (!currentUser) return;
            setLoadingEventos(true);
            setErrorEventos('');
            try {
                // Fetch events for the current month and year for simplicity
                // A more sophisticated approach would be to fetch upcoming events from today onwards
                const today = new Date();
                const ano = today.getFullYear();
                const mes = today.getMonth() + 1; // API might expect 1-12 for month

                const response = await axios.get(`${API_URL}/calendario/eventos`, {
                    params: { ano, mes } // Add more specific filters if needed, e.g., userId for user-specific events
                });
                
                // Filter events from today onwards and sort them
                const eventosFiltrados = response.data
                    .filter(evento => new Date(evento.data_evento) >= new Date(today.toDateString())) // Compare date part only
                    .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));

                setProximosEventos(eventosFiltrados.slice(0, 5)); // Show next 5 events
            } catch (err) {
                console.error("Erro ao buscar próximos eventos:", err);
                setErrorEventos('Não foi possível carregar os próximos eventos.');
            }
            setLoadingEventos(false);
        };

        fetchProximosEventos();
    }, [currentUser]);

    const calcularDiasRestantes = (dataEvento) => {
        const hoje = new Date();
        const eventoData = new Date(dataEvento);
        // Reset time part to compare dates only
        hoje.setHours(0, 0, 0, 0);
        eventoData.setHours(0, 0, 0, 0);
        const diffTime = eventoData - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'Evento passado'; // Should not happen with current filter
        if (diffDays === 0) return 'Hoje';
        if (diffDays === 1) return 'Amanhã';
        return `Faltam ${diffDays} dias`;
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Bem-vindo(a), {currentUser?.nome_completo || currentUser?.nome_usuario}!</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Card de Próximos Eventos */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Próximos Eventos no seu Calendário</h2>
                    {loadingEventos && <p className="text-gray-600">Carregando eventos...</p>}
                    {errorEventos && <p className="text-red-500">{errorEventos}</p>}
                    {!loadingEventos && proximosEventos.length === 0 && !errorEventos && (
                        <p className="text-gray-600">Nenhum evento próximo encontrado.</p>
                    )}
                    {!loadingEventos && proximosEventos.length > 0 && (
                        <ul className="space-y-3">
                            {proximosEventos.map(evento => (
                                <li key={evento.id} className="p-3 bg-gray-50 rounded-md shadow-sm">
                                    <p className="font-medium text-gray-800">{evento.nome_gravacao}</p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(evento.data_evento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} às {evento.horario_inicio.substring(0,5)}
                                    </p>
                                    <p className="text-sm font-semibold text-blue-600">{calcularDiasRestantes(evento.data_evento)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Outros cards de resumo ou atalhos podem ser adicionados aqui */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Acesso Rápido</h2>
                    <ul className="space-y-2">
                        <li><Link to="/roteiros/novo" className="text-blue-600 hover:text-blue-800 hover:underline">Criar Novo Roteiro</Link></li>
                        <li><Link to="/calendario" className="text-blue-600 hover:text-blue-800 hover:underline">Ver Calendário Completo</Link></li>
                        <li><Link to="/equipamentos" className="text-blue-600 hover:text-blue-800 hover:underline">Gerenciar Equipamentos</Link></li>
                    </ul>
                </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Módulos Disponíveis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <Link to="/roteiros" className="block p-6 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-transform transform hover:scale-105">
                    <h3 className="text-xl font-bold mb-2">Roteiros</h3>
                    <p className="text-sm">Crie, organize e edite seus roteiros e espelhos de gravação.</p>
                </Link>
                <Link to="/calendario" className="block p-6 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md transition-transform transform hover:scale-105">
                    <h3 className="text-xl font-bold mb-2">Calendário</h3>
                    <p className="text-sm">Agende e visualize suas gravações e eventos.</p>
                </Link>
                <Link to="/equipamentos" className="block p-6 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-md transition-transform transform hover:scale-105">
                    <h3 className="text-xl font-bold mb-2">Equipamentos</h3>
                    <p className="text-sm">Cadastre e controle os equipamentos da produtora.</p>
                </Link>
                <Link to="/checklists" className="block p-6 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-md transition-transform transform hover:scale-105">
                    <h3 className="text-xl font-bold mb-2">Checklists</h3>
                    <p className="text-sm">Gere checklists de equipamentos para suas gravações.</p>
                </Link>
                <Link to="/configuracoes" className="block p-6 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-transform transform hover:scale-105">
                    <h3 className="text-xl font-bold mb-2">Configurações</h3>
                    <p className="text-sm">Ajuste as configurações da sua conta e da plataforma.</p>
                </Link>
            </div>
        </div>
    );
};

export default DashboardPage;

