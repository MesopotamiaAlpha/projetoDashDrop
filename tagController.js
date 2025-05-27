const { pool } = require("../config/db");
const { logAudit } = require("./authController");

// Paleta de cores pré-definida para novas tags
const PREDEFINED_COLORS = [
    "#FFADAD", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", 
    "#A0C4FF", "#BDB2FF", "#FFC6FF", "#E4F0D0", "#F7D6E0",
    "#F2B5D4", "#FBC4AB", "#FFDAB9", "#E6E6FA", "#D8BFD8", 
    "#B0E0E6", "#ADD8E6", "#87CEFA", "#7FFFD4", "#F0FFF0"
];

// Função para gerar uma cor única
async function generateUniqueColor() {
    let connection;
    try {
        connection = await pool.getConnection();
        const [existingTags] = await connection.query("SELECT cor FROM Tags WHERE cor IS NOT NULL");
        const existingColors = existingTags.map(tag => tag.cor);
        
        const availablePredefined = PREDEFINED_COLORS.filter(color => !existingColors.includes(color));
        
        if (availablePredefined.length > 0) {
            // Retorna uma cor aleatória das predefinidas disponíveis
            return availablePredefined[Math.floor(Math.random() * availablePredefined.length)];
        } else {
            // Gera uma cor aleatória se as predefinidas acabaram
            let newColor;
            let attempts = 0;
            do {
                const r = () => Math.floor(Math.random() * 256);
                newColor = `#${r().toString(16).padStart(2, '0')}${r().toString(16).padStart(2, '0')}${r().toString(16).padStart(2, '0')}`.toUpperCase();
                attempts++;
            } while (existingColors.includes(newColor) && attempts < 100); // Evita loop infinito (improvável)
            
            if (existingColors.includes(newColor)) {
                 console.warn("Não foi possível gerar uma cor única após 100 tentativas, usando cor padrão.");
                 return "#CCCCCC"; // Cor padrão fallback
            }
            return newColor;
        }
    } catch (error) {
        console.error("Erro ao gerar cor única:", error);
        return "#CCCCCC"; // Retorna cor padrão em caso de erro
    } finally {
        if (connection) connection.release();
    }
}

// Criar nova tag
const createTag = async (req, res) => {
    const { nome, cor } = req.body;
    const userId = req.user.userId;

    if (!nome) {
        return res.status(400).json({ message: "Nome da tag é obrigatório." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se a tag já existe
        const [existing] = await connection.query("SELECT id FROM Tags WHERE nome = ?", [nome]);
        if (existing.length > 0) {
            return res.status(409).json({ message: "Tag com este nome já existe." });
        }

        let finalCor = cor;
        if (!finalCor) {
            finalCor = await generateUniqueColor();
        }

        const [result] = await connection.query(
            "INSERT INTO Tags (nome, cor, criado_por_id, atualizado_por_id) VALUES (?, ?, ?, ?)",
            [nome, finalCor, userId, userId]
        );
        const newTagId = result.insertId;

        await logAudit("Tags", newTagId, "CRIACAO", userId, { nome, cor: finalCor });

        res.status(201).json({ message: "Tag criada com sucesso!", tag: { id: newTagId, nome, cor: finalCor } });

    } catch (error) {
        console.error("Erro ao criar tag:", error);
        res.status(500).json({ message: "Erro interno do servidor ao criar tag.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Obter todas as tags
const getAllTags = async (req, res) => {
    try {
        const [tags] = await pool.query("SELECT id, nome, cor FROM Tags ORDER BY nome ASC");
        res.json(tags);
    } catch (error) {
        console.error("Erro ao buscar tags:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Obter uma tag específica por ID (pode ser útil)
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

// Atualizar uma tag por ID
const updateTag = async (req, res) => {
    const { id } = req.params;
    const { nome, cor } = req.body;
    const userId = req.user.userId;

    if (!nome && !cor) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se a tag existe
        const [currentTag] = await connection.query("SELECT id FROM Tags WHERE id = ?", [id]);
        if (currentTag.length === 0) {
            return res.status(404).json({ message: "Tag não encontrada." });
        }
        
        // Verificar se o novo nome já existe em outra tag
        if (nome) {
            const [existingName] = await connection.query("SELECT id FROM Tags WHERE nome = ? AND id != ?", [nome, id]);
            if (existingName.length > 0) {
                return res.status(409).json({ message: "Já existe outra tag com este nome." });
            }
        }

        const fieldsToUpdate = {};
        if (nome !== undefined) fieldsToUpdate.nome = nome;
        if (cor !== undefined) fieldsToUpdate.cor = cor;
        fieldsToUpdate.atualizado_por_id = userId;

        await connection.query("UPDATE Tags SET ? WHERE id = ?", [fieldsToUpdate, id]);
        
        await logAudit("Tags", parseInt(id), "ATUALIZACAO", userId, fieldsToUpdate);

        const [updatedTag] = await connection.query("SELECT id, nome, cor FROM Tags WHERE id = ?", [id]);
        res.json({ message: "Tag atualizada com sucesso!", tag: updatedTag[0] });

    } catch (error) {
        console.error("Erro ao atualizar tag:", error);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar tag.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Excluir uma tag por ID
const deleteTag = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Remover associações em RoteiroTags e CenaTags antes de excluir a tag
        await connection.query("DELETE FROM RoteiroTags WHERE tag_id = ?", [id]);
        await connection.query("DELETE FROM CenaTags WHERE tag_id = ?", [id]);

        const [result] = await connection.query("DELETE FROM Tags WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Tag não encontrada para exclusão." });
        }

        await logAudit("Tags", parseInt(id), "DELECAO", userId, { tagId: id });
        await connection.commit();

        res.status(200).json({ message: "Tag excluída com sucesso!" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao excluir tag:", error);
        res.status(500).json({ message: "Erro interno do servidor ao excluir tag.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    createTag,
    getAllTags,
    getTagById,
    updateTag,
    deleteTag
};

