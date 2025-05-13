const { pool } = require("../config/db");
const { logAudit } = require("./authController"); // Re-using logAudit

// Create a new checklist for a gravação
const createChecklist = async (req, res) => {
    const { nome_gravacao_associada, evento_id, data_checklist, itens } = req.body; // itens is an array of { equipamento_id, quantidade_a_levar }
    const userId = req.user.userId;

    if (!nome_gravacao_associada || !data_checklist) {
        return res.status(400).json({ message: "Nome da gravação associada e data do checklist são obrigatórios." });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ message: "Pelo menos um item de equipamento deve ser fornecido para o checklist." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(
            "INSERT INTO ChecklistsGravacao (nome_gravacao_associada, evento_id, data_checklist, usuario_id, criado_por_id, atualizado_por_id) VALUES (?, ?, ?, ?, ?, ?)",
            [nome_gravacao_associada, evento_id || null, data_checklist, userId, userId, userId]
        );
        const newChecklistId = result.insertId;

        const itemValues = itens.map(item => [newChecklistId, item.equipamento_id, item.quantidade_a_levar || 1]);
        await connection.query("INSERT INTO ChecklistItens (checklist_id, equipamento_id, quantidade_a_levar) VALUES ?", [itemValues]);

        await logAudit("ChecklistsGravacao", newChecklistId, "CRIACAO", userId, { nome_gravacao_associada, data_checklist, itemCount: itens.length });
        await connection.commit();

        res.status(201).json({ 
            message: "Checklist criado com sucesso!", 
            checklistId: newChecklistId,
            nome_gravacao_associada
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao criar checklist:", error);
        // Check for foreign key violation on equipamento_id
        if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.sqlMessage.includes('fk_checklistitens_equipamento')) {
            return res.status(400).json({ message: "Um ou mais IDs de equipamento fornecidos são inválidos." });
        }
        res.status(500).json({ message: "Erro interno do servidor ao criar checklist.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get all checklists
const getAllChecklists = async (req, res) => {
    try {
        // Simple listing for now, can be expanded with filters (e.g., by date range, by gravação name)
        const [checklists] = await pool.query(
            `SELECT cg.*, u.nome_usuario as criador_nome 
             FROM ChecklistsGravacao cg
             LEFT JOIN Usuarios u ON cg.usuario_id = u.id
             ORDER BY cg.data_checklist DESC, cg.nome_gravacao_associada ASC`
        );
        res.json(checklists);
    } catch (error) {
        console.error("Erro ao buscar todos os checklists:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Get a specific checklist by ID (including its items)
const getChecklistById = async (req, res) => {
    const { id } = req.params;
    try {
        const [checklists] = await pool.query(
            `SELECT cg.*, u.nome_usuario as criador_nome 
             FROM ChecklistsGravacao cg
             LEFT JOIN Usuarios u ON cg.usuario_id = u.id
             WHERE cg.id = ?`,
            [id]
        );

        if (checklists.length === 0) {
            return res.status(404).json({ message: "Checklist não encontrado." });
        }
        const checklist = checklists[0];

        const [itens] = await pool.query(
            `SELECT ci.id as item_id, ci.equipamento_id, e.nome as equipamento_nome, e.numero_serie, ci.quantidade_a_levar 
             FROM ChecklistItens ci 
             JOIN Equipamentos e ON ci.equipamento_id = e.id 
             WHERE ci.checklist_id = ? 
             ORDER BY e.nome ASC`,
            [id]
        );

        res.json({ ...checklist, itens });

    } catch (error) {
        console.error("Erro ao buscar checklist por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update a checklist by ID
const updateChecklist = async (req, res) => {
    const { id } = req.params;
    const { nome_gravacao_associada, evento_id, data_checklist, itens } = req.body; // itens is an array of { equipamento_id, quantidade_a_levar }
    const userId = req.user.userId;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const fieldsToUpdate = {};
        if (nome_gravacao_associada !== undefined) fieldsToUpdate.nome_gravacao_associada = nome_gravacao_associada;
        if (evento_id !== undefined) fieldsToUpdate.evento_id = evento_id || null;
        if (data_checklist !== undefined) fieldsToUpdate.data_checklist = data_checklist;
        fieldsToUpdate.atualizado_por_id = userId;

        if (Object.keys(fieldsToUpdate).length > 1) { // Check if there are fields other than atualizado_por_id
            await connection.query("UPDATE ChecklistsGravacao SET ? WHERE id = ?", [fieldsToUpdate, id]);
        }

        if (itens !== undefined) { // If itens array is provided, replace all existing items for this checklist
            await connection.query("DELETE FROM ChecklistItens WHERE checklist_id = ?", [id]);
            if (itens.length > 0) {
                const itemValues = itens.map(item => [id, item.equipamento_id, item.quantidade_a_levar || 1]);
                await connection.query("INSERT INTO ChecklistItens (checklist_id, equipamento_id, quantidade_a_levar) VALUES ?", [itemValues]);
            }
        }

        await logAudit("ChecklistsGravacao", parseInt(id), "ATUALIZACAO", userId, { ...fieldsToUpdate, itemCount: itens ? itens.length : undefined });
        await connection.commit();

        // Fetch the updated checklist to return it
        const updatedChecklist = await getChecklistByIdForInternalUse(id, connection);
        res.json({ message: "Checklist atualizado com sucesso!", checklist: updatedChecklist });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar checklist:", error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.sqlMessage.includes('fk_checklistitens_equipamento')) {
            return res.status(400).json({ message: "Um ou mais IDs de equipamento fornecidos para os itens são inválidos." });
        }
        res.status(500).json({ message: "Erro interno do servidor ao atualizar checklist.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Helper function to get checklist by ID, used internally after updates
async function getChecklistByIdForInternalUse(id, dbConnection) {
    const [checklists] = await (dbConnection || pool).query(
        `SELECT cg.*, u.nome_usuario as criador_nome 
         FROM ChecklistsGravacao cg
         LEFT JOIN Usuarios u ON cg.usuario_id = u.id
         WHERE cg.id = ?`,
        [id]
    );
    if (checklists.length === 0) return null;
    const checklist = checklists[0];

    const [itens] = await (dbConnection || pool).query(
        `SELECT ci.id as item_id, ci.equipamento_id, e.nome as equipamento_nome, e.numero_serie, ci.quantidade_a_levar 
         FROM ChecklistItens ci 
         JOIN Equipamentos e ON ci.equipamento_id = e.id 
         WHERE ci.checklist_id = ? 
         ORDER BY e.nome ASC`,
        [id]
    );
    return { ...checklist, itens };
}

// Delete a checklist by ID
const deleteChecklist = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // ChecklistItens will be deleted by CASCADE constraint in DB
        const [result] = await connection.query("DELETE FROM ChecklistsGravacao WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Checklist não encontrado para exclusão." });
        }

        await logAudit("ChecklistsGravacao", parseInt(id), "DELECAO", userId, { checklistId: id });
        await connection.commit();

        res.status(200).json({ message: "Checklist excluído com sucesso!" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao excluir checklist:", error);
        res.status(500).json({ message: "Erro interno do servidor ao excluir checklist.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    createChecklist,
    getAllChecklists,
    getChecklistById,
    updateChecklist,
    deleteChecklist
};
