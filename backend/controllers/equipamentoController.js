const { pool } = require("../config/db");
const { logAudit } = require("./authController"); // Re-using logAudit

// Create a new equipamento
const createEquipamento = async (req, res) => {
    const { nome, numero_serie, categoria, data_ultima_manutencao, tipo_equipamento } = req.body;
    const userId = req.user.userId;

    if (!nome) {
        return res.status(400).json({ message: "O nome do equipamento é obrigatório." });
    }

    try {
        if (numero_serie) {
            const [existingSerial] = await pool.query("SELECT id FROM Equipamentos WHERE numero_serie = ?", [numero_serie]);
            if (existingSerial.length > 0) {
                return res.status(409).json({ message: "Um equipamento com este número de série já existe." });
            }
        }

        const [result] = await pool.query(
            "INSERT INTO Equipamentos (nome, numero_serie, categoria, data_ultima_manutencao, tipo_equipamento, criado_por_id, atualizado_por_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [nome, numero_serie, categoria, data_ultima_manutencao, tipo_equipamento, userId, userId]
        );
        const newEquipamentoId = result.insertId;

        await logAudit("Equipamentos", newEquipamentoId, "CRIACAO", userId, { nome, numero_serie });

        res.status(201).json({ 
            message: "Equipamento cadastrado com sucesso!", 
            equipamentoId: newEquipamentoId,
            nome
        });
    } catch (error) {
        console.error("Erro ao cadastrar equipamento:", error);
        res.status(500).json({ message: "Erro interno do servidor ao cadastrar equipamento.", error: error.message });
    }
};

// Get all equipamentos
const getAllEquipamentos = async (req, res) => {
    try {
        const [equipamentos] = await pool.query("SELECT * FROM Equipamentos ORDER BY nome ASC");
        res.json(equipamentos);
    } catch (error) {
        console.error("Erro ao buscar todos os equipamentos:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Get a specific equipamento by ID
const getEquipamentoById = async (req, res) => {
    const { id } = req.params;
    try {
        const [equipamentos] = await pool.query("SELECT * FROM Equipamentos WHERE id = ?", [id]);
        if (equipamentos.length === 0) {
            return res.status(404).json({ message: "Equipamento não encontrado." });
        }
        res.json(equipamentos[0]);
    } catch (error) {
        console.error("Erro ao buscar equipamento por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update an equipamento by ID
const updateEquipamento = async (req, res) => {
    const { id } = req.params;
    const { nome, numero_serie, categoria, data_ultima_manutencao, tipo_equipamento } = req.body;
    const userId = req.user.userId;

    try {
        const [currentEquipamento] = await pool.query("SELECT * FROM Equipamentos WHERE id = ?", [id]);
        if (currentEquipamento.length === 0) {
            return res.status(404).json({ message: "Equipamento não encontrado para atualização." });
        }

        if (numero_serie && numero_serie !== currentEquipamento[0].numero_serie) {
            const [existingSerial] = await pool.query("SELECT id FROM Equipamentos WHERE numero_serie = ? AND id != ?", [numero_serie, id]);
            if (existingSerial.length > 0) {
                return res.status(409).json({ message: "Um equipamento com este número de série já existe." });
            }
        }

        const fieldsToUpdate = {};
        if (nome !== undefined) fieldsToUpdate.nome = nome;
        if (numero_serie !== undefined) fieldsToUpdate.numero_serie = numero_serie;
        if (categoria !== undefined) fieldsToUpdate.categoria = categoria;
        if (data_ultima_manutencao !== undefined) fieldsToUpdate.data_ultima_manutencao = data_ultima_manutencao;
        if (tipo_equipamento !== undefined) fieldsToUpdate.tipo_equipamento = tipo_equipamento;
        fieldsToUpdate.atualizado_por_id = userId;

        if (Object.keys(fieldsToUpdate).length <= 1) { // Only atualizado_por_id
            return res.status(400).json({ message: "Nenhum dado fornecido para atualização do equipamento." });
        }

        const [result] = await pool.query("UPDATE Equipamentos SET ? WHERE id = ?", [fieldsToUpdate, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Equipamento não encontrado para atualização (concorrência?)." });
        }

        await logAudit("Equipamentos", parseInt(id), "ATUALIZACAO", userId, fieldsToUpdate);
        
        const [updatedEquipamento] = await pool.query("SELECT * FROM Equipamentos WHERE id = ?", [id]);
        res.json({ message: "Equipamento atualizado com sucesso!", equipamento: updatedEquipamento[0] });

    } catch (error) {
        console.error("Erro ao atualizar equipamento:", error);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar equipamento.", error: error.message });
    }
};

// Delete an equipamento by ID
const deleteEquipamento = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        // Check if the equipamento is associated with any ChecklistItens before deleting
        const [checklistItens] = await pool.query("SELECT checklist_id FROM ChecklistItens WHERE equipamento_id = ?", [id]);
        if (checklistItens.length > 0) {
            return res.status(400).json({ 
                message: "Este equipamento está associado a um ou mais checklists e não pode ser excluído. Remova-o dos checklists primeiro.",
                associatedChecklistsCount: checklistItens.length
            });
        }

        const [result] = await pool.query("DELETE FROM Equipamentos WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Equipamento não encontrado para exclusão." });
        }

        await logAudit("Equipamentos", parseInt(id), "DELECAO", userId, { equipamentoId: id });

        res.status(200).json({ message: "Equipamento excluído com sucesso!" });
    } catch (error) {
        console.error("Erro ao excluir equipamento:", error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') { // MySQL specific error code for foreign key constraint
             return res.status(400).json({ message: "Este equipamento está em uso em um checklist e não pode ser excluído." });
        }
        res.status(500).json({ message: "Erro interno do servidor ao excluir equipamento.", error: error.message });
    }
};

module.exports = {
    createEquipamento,
    getAllEquipamentos,
    getEquipamentoById,
    updateEquipamento,
    deleteEquipamento
};
