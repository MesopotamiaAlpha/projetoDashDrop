const { pool } = require("../config/db");
const { logAudit } = require("./authController"); // Re-using logAudit

// Create a new tag
const createTag = async (req, res) => {
    const { nome, cor } = req.body;
    const userId = req.user.userId;

    if (!nome) {
        return res.status(400).json({ message: "O nome da tag é obrigatório." });
    }

    try {
        const [existingTag] = await pool.query("SELECT id FROM Tags WHERE nome = ?", [nome]);
        if (existingTag.length > 0) {
            return res.status(409).json({ message: "Uma tag com este nome já existe." });
        }

        const [result] = await pool.query(
            "INSERT INTO Tags (nome, cor, criado_por_id, atualizado_por_id) VALUES (?, ?, ?, ?)",
            [nome, cor || "#FFFFFF", userId, userId]
        );
        const newTagId = result.insertId;

        await logAudit("Tags", newTagId, "CRIACAO", userId, { nome, cor });

        res.status(201).json({ message: "Tag criada com sucesso!", tagId: newTagId, nome, cor: cor || "#FFFFFF" });
    } catch (error) {
        console.error("Erro ao criar tag:", error);
        res.status(500).json({ message: "Erro interno do servidor ao criar tag.", error: error.message });
    }
};

// Get all tags
const getAllTags = async (req, res) => {
    try {
        const [tags] = await pool.query("SELECT id, nome, cor FROM Tags ORDER BY nome ASC");
        res.json(tags);
    } catch (error) {
        console.error("Erro ao buscar todas as tags:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Get a specific tag by ID
const getTagById = async (req, res) => {
    const { id } = req.params;
    try {
        const [tags] = await pool.query("SELECT id, nome, cor FROM Tags WHERE id = ?", [id]);
        if (tags.length === 0) {
            return res.status(404).json({ message: "Tag não encontrada." });
        }
        res.json(tags[0]);
    } catch (error) {
        console.error("Erro ao buscar tag por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update a tag by ID
const updateTag = async (req, res) => {
    const { id } = req.params;
    const { nome, cor } = req.body;
    const userId = req.user.userId;

    if (!nome && !cor) {
        return res.status(400).json({ message: "Pelo menos um campo (nome ou cor) deve ser fornecido para atualização." });
    }

    try {
        const [currentTag] = await pool.query("SELECT * FROM Tags WHERE id = ?", [id]);
        if (currentTag.length === 0) {
            return res.status(404).json({ message: "Tag não encontrada para atualização." });
        }

        // Check for name conflict if name is being changed
        if (nome && nome !== currentTag[0].nome) {
            const [existingTag] = await pool.query("SELECT id FROM Tags WHERE nome = ? AND id != ?", [nome, id]);
            if (existingTag.length > 0) {
                return res.status(409).json({ message: "Uma tag com este nome já existe." });
            }
        }

        const fieldsToUpdate = {};
        if (nome !== undefined) fieldsToUpdate.nome = nome;
        if (cor !== undefined) fieldsToUpdate.cor = cor;
        fieldsToUpdate.atualizado_por_id = userId;
        // The `atualizado_em` field will be updated automatically by MySQL

        const [result] = await pool.query("UPDATE Tags SET ? WHERE id = ?", [fieldsToUpdate, id]);

        if (result.affectedRows === 0) {
            // This case should ideally be caught by the check above, but as a safeguard:
            return res.status(404).json({ message: "Tag não encontrada para atualização (concorrência?)." });
        }

        await logAudit("Tags", parseInt(id), "ATUALIZACAO", userId, fieldsToUpdate);
        
        const [updatedTag] = await pool.query("SELECT id, nome, cor FROM Tags WHERE id = ?", [id]);

        res.json({ message: "Tag atualizada com sucesso!", tag: updatedTag[0] });
    } catch (error) {
        console.error("Erro ao atualizar tag:", error);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar tag.", error: error.message });
    }
};

// Delete a tag by ID
const deleteTag = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId; // For audit logging

    try {
        // Optional: Check if the tag is associated with any Roteiros before deleting
        const [roteiroTags] = await pool.query("SELECT roteiro_id FROM RoteiroTags WHERE tag_id = ?", [id]);
        if (roteiroTags.length > 0) {
            return res.status(400).json({ 
                message: "Esta tag está associada a um ou mais roteiros e não pode ser excluída. Remova a associação dos roteiros primeiro.",
                associatedRoteirosCount: roteiroTags.length
            });
        }

        const [result] = await pool.query("DELETE FROM Tags WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tag não encontrada para exclusão." });
        }

        await logAudit("Tags", parseInt(id), "DELECAO", userId, { tagId: id });

        res.status(200).json({ message: "Tag excluída com sucesso!" }); // 200 OK or 204 No Content
    } catch (error) {
        console.error("Erro ao excluir tag:", error);
        // Check for foreign key constraint errors if not checking associations beforehand
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
             return res.status(400).json({ message: "Esta tag está em uso e não pode ser excluída." });
        }
        res.status(500).json({ message: "Erro interno do servidor ao excluir tag.", error: error.message });
    }
};

module.exports = {
    createTag,
    getAllTags,
    getTagById,
    updateTag,
    deleteTag
};
