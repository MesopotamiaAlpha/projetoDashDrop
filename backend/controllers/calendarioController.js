const { pool } = require("../config/db");
const { logAudit } = require("./authController"); // Re-using logAudit

// Função para gerar uma cor aleatória em formato hexadecimal
const gerarCorAleatoria = () => {
    const cores = [
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
    
    return cores[Math.floor(Math.random() * cores.length)];
};

// Create a new calendar event
const createEvento = async (req, res) => {
    const { nome_gravacao, data_evento, horario_inicio, horario_fim, tema, apresentador_ids, cor } = req.body; // apresentador_ids is an array of user IDs
    const userId = req.user.userId;

    if (!nome_gravacao || !data_evento || !horario_inicio) {
        return res.status(400).json({ message: "Nome da gravação, data e horário de início são obrigatórios." });
    }

    // Se a cor não for fornecida, gera uma cor aleatória
    const eventColor = cor || gerarCorAleatoria();

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(
            "INSERT INTO EventosCalendario (nome_gravacao, data_evento, horario_inicio, horario_fim, tema, usuario_id, criado_por_id, atualizado_por_id, cor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [nome_gravacao, data_evento, horario_inicio, horario_fim, tema, userId, userId, userId, eventColor]
        );
        const newEventoId = result.insertId;

        if (apresentador_ids && apresentador_ids.length > 0) {
            // Ensure presenters exist and have the 'perfil_apresentador' flag (optional check, depends on strictness)
            // For now, we assume valid IDs are passed.
            const apresentadorValues = apresentador_ids.map(apresentadorId => [newEventoId, apresentadorId]);
            await connection.query("INSERT INTO EventoApresentadores (evento_id, apresentador_id) VALUES ?", [apresentadorValues]);
        }

        await logAudit("EventosCalendario", newEventoId, "CRIACAO", userId, { nome_gravacao, data_evento, apresentador_ids });
        await connection.commit();

        res.status(201).json({ 
            message: "Evento de calendário criado com sucesso!", 
            eventoId: newEventoId,
            nome_gravacao
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao criar evento no calendário:", error);
        res.status(500).json({ message: "Erro interno do servidor ao criar evento.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get all calendar events (with filters for mes, apresentadora, tema)
const getAllEventos = async (req, res) => {
    const { mes, ano, apresentadorId, tema } = req.query;
    
    let query = `
        SELECT DISTINCT e.id, e.nome_gravacao, e.data_evento, e.horario_inicio, e.horario_fim, e.tema, e.cor,
               uc.nome_usuario as criador_evento_nome,
               GROUP_CONCAT(DISTINCT ua.id SEPARATOR ",") as apresentador_ids,
               GROUP_CONCAT(DISTINCT ua.nome_completo SEPARATOR ";") as apresentador_nomes
        FROM EventosCalendario e
        LEFT JOIN Usuarios uc ON e.usuario_id = uc.id
        LEFT JOIN EventoApresentadores ea ON e.id = ea.evento_id
        LEFT JOIN Usuarios ua ON ea.apresentador_id = ua.id
    `;
    const params = [];
    const conditions = [];

    if (ano && mes) {
        conditions.push("YEAR(e.data_evento) = ? AND MONTH(e.data_evento) = ?");
        params.push(ano, mes);
    } else if (ano) {
        conditions.push("YEAR(e.data_evento) = ?");
        params.push(ano);
    } else if (mes) {
        // This would search for the month across all years, might need clarification if only current year's month is needed.
        conditions.push("MONTH(e.data_evento) = ?");
        params.push(mes);
    }

    if (apresentadorId) {
        // This requires the JOIN with EventoApresentadores and Usuarios ua to be effective
        conditions.push("e.id IN (SELECT evento_id FROM EventoApresentadores WHERE apresentador_id = ?)");
        params.push(apresentadorId);
    }
    if (tema) {
        conditions.push("e.tema LIKE ?");
        params.push(`%${tema}%`);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY e.id ORDER BY e.data_evento ASC, e.horario_inicio ASC";

    try {
        const [eventos] = await pool.query(query, params);
        const result = eventos.map(ev => ({
            ...ev,
            apresentadores: ev.apresentador_ids ? ev.apresentador_ids.split(",").map((id, index) => ({
                id: parseInt(id),
                nome_completo: ev.apresentador_nomes.split(";")[index]
            })) : [],
            apresentador_ids: undefined, // remove redundant fields
            apresentador_nomes: undefined
        }));
        res.json(result);
    } catch (error) {
        console.error("Erro ao buscar eventos do calendário:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Get a specific calendar event by ID
const getEventoById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT e.*, uc.nome_usuario as criador_evento_nome,
                   GROUP_CONCAT(DISTINCT ua.id SEPARATOR ",") as apresentador_ids,
                   GROUP_CONCAT(DISTINCT ua.nome_completo SEPARATOR ";") as apresentador_nomes
            FROM EventosCalendario e
            LEFT JOIN Usuarios uc ON e.usuario_id = uc.id
            LEFT JOIN EventoApresentadores ea ON e.id = ea.evento_id
            LEFT JOIN Usuarios ua ON ea.apresentador_id = ua.id
            WHERE e.id = ?
            GROUP BY e.id
        `;
        const [eventos] = await pool.query(query, [id]);
        if (eventos.length === 0) {
            return res.status(404).json({ message: "Evento não encontrado." });
        }
        const evento = eventos[0];
        const result = {
            ...evento,
            apresentadores: evento.apresentador_ids ? evento.apresentador_ids.split(",").map((ap_id, index) => ({
                id: parseInt(ap_id),
                nome_completo: evento.apresentador_nomes.split(";")[index]
            })) : [],
            apresentador_ids: undefined,
            apresentador_nomes: undefined
        };
        res.json(result);
    } catch (error) {
        console.error("Erro ao buscar evento por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update a calendar event by ID
const updateEvento = async (req, res) => {
    const { id } = req.params;
    const { nome_gravacao, data_evento, horario_inicio, horario_fim, tema, apresentador_ids, cor } = req.body;
    const userId = req.user.userId;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const fieldsToUpdate = {};
        if (nome_gravacao !== undefined) fieldsToUpdate.nome_gravacao = nome_gravacao;
        if (data_evento !== undefined) fieldsToUpdate.data_evento = data_evento;
        if (horario_inicio !== undefined) fieldsToUpdate.horario_inicio = horario_inicio;
        if (horario_fim !== undefined) fieldsToUpdate.horario_fim = horario_fim; // Allow setting to null
        if (tema !== undefined) fieldsToUpdate.tema = tema;
        if (cor !== undefined) fieldsToUpdate.cor = cor;
        fieldsToUpdate.atualizado_por_id = userId;

        if (Object.keys(fieldsToUpdate).length > 1) { // Check if there are fields other than atualizado_por_id
             await connection.query("UPDATE EventosCalendario SET ? WHERE id = ?", [fieldsToUpdate, id]);
        }

        if (apresentador_ids !== undefined) { // If apresentador_ids array is provided, replace all existing associations
            await connection.query("DELETE FROM EventoApresentadores WHERE evento_id = ?", [id]);
            if (apresentador_ids.length > 0) {
                const apresentadorValues = apresentador_ids.map(apresentadorId => [id, apresentadorId]);
                await connection.query("INSERT INTO EventoApresentadores (evento_id, apresentador_id) VALUES ?", [apresentadorValues]);
            }
        }

        await logAudit("EventosCalendario", parseInt(id), "ATUALIZACAO", userId, { ...fieldsToUpdate, apresentador_ids });
        await connection.commit();

        // Fetch the updated evento to return it
        const updatedEvento = await getEventoByIdForInternalUse(id, connection);
        res.json({ message: "Evento atualizado com sucesso!", evento: updatedEvento });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar evento:", error);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar evento.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Helper function to get evento by ID, used internally after updates
async function getEventoByIdForInternalUse(id, dbConnection) {
    const query = `
        SELECT e.*, uc.nome_usuario as criador_evento_nome,
               GROUP_CONCAT(DISTINCT ua.id SEPARATOR ",") as apresentador_ids,
               GROUP_CONCAT(DISTINCT ua.nome_completo SEPARATOR ";") as apresentador_nomes
        FROM EventosCalendario e
        LEFT JOIN Usuarios uc ON e.usuario_id = uc.id
        LEFT JOIN EventoApresentadores ea ON e.id = ea.evento_id
        LEFT JOIN Usuarios ua ON ea.apresentador_id = ua.id
        WHERE e.id = ?
        GROUP BY e.id
    `;
    const [eventos] = await (dbConnection || pool).query(query, [id]);
    if (eventos.length === 0) return null;
    const evento = eventos[0];
    return {
        ...evento,
        apresentadores: evento.apresentador_ids ? evento.apresentador_ids.split(",").map((ap_id, index) => ({
            id: parseInt(ap_id),
            nome_completo: evento.apresentador_nomes.split(";")[index]
        })) : [],
        apresentador_ids: undefined,
        apresentador_nomes: undefined
    };
}

// Delete a calendar event by ID
const deleteEvento = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // EventoApresentadores will be deleted by CASCADE constraint in DB
        const [result] = await connection.query("DELETE FROM EventosCalendario WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Evento não encontrado para exclusão." });
        }

        await logAudit("EventosCalendario", parseInt(id), "DELECAO", userId, { eventoId: id });
        await connection.commit();

        res.status(200).json({ message: "Evento excluído com sucesso!" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao excluir evento:", error);
        res.status(500).json({ message: "Erro interno do servidor ao excluir evento.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    createEvento,
    getAllEventos,
    getEventoById,
    updateEvento,
    deleteEvento
};
