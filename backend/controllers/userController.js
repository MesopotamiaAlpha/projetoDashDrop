const { pool } = require("../config/db");
const { logAudit } = require("./authController");
const bcrypt = require("bcryptjs");

// Get current logged-in user's profile
const getCurrentUserProfile = async (req, res) => {
    try {
        const [users] = await pool.query("SELECT id, nome_usuario, nome_completo, email, perfil_apresentador, logo_empresa_path FROM Usuarios WHERE id = ?", [req.user.userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        res.json(users[0]);
    } catch (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update current logged-in user's profile (self-update)
const updateCurrentUserProfile = async (req, res) => {
    const { nome_completo, email, perfil_apresentador, logo_empresa_path, senha_antiga, nova_senha } = req.body;
    const userId = req.user.userId;

    try {
        const [currentUserRows] = await pool.query("SELECT * FROM Usuarios WHERE id = ?", [userId]);
        if (currentUserRows.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        const currentUser = currentUserRows[0];

        let senha_hash_nova = currentUser.senha_hash;

        if (nova_senha) {
            if (!senha_antiga) {
                return res.status(400).json({ message: "Senha antiga é obrigatória para definir uma nova senha." });
            }
            const isMatch = await bcrypt.compare(senha_antiga, currentUser.senha_hash);
            if (!isMatch) {
                return res.status(401).json({ message: "Senha antiga incorreta." });
            }
            const salt = await bcrypt.genSalt(10);
            senha_hash_nova = await bcrypt.hash(nova_senha, salt);
        }

        if (email && email !== currentUser.email) {
            const [existingUsers] = await pool.query("SELECT id FROM Usuarios WHERE email = ? AND id != ?", [email, userId]);
            if (existingUsers.length > 0) {
                return res.status(409).json({ message: "Este email já está em uso por outro usuário." });
            }
        }

        const fieldsToUpdate = {};
        if (nome_completo !== undefined) fieldsToUpdate.nome_completo = nome_completo;
        if (email !== undefined) fieldsToUpdate.email = email;
        if (perfil_apresentador !== undefined) fieldsToUpdate.perfil_apresentador = perfil_apresentador;
        if (logo_empresa_path !== undefined) fieldsToUpdate.logo_empresa_path = logo_empresa_path;
        if (nova_senha) fieldsToUpdate.senha_hash = senha_hash_nova;

        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({ message: "Nenhum dado fornecido para atualização." });
        }

        await pool.query("UPDATE Usuarios SET ? WHERE id = ?", [fieldsToUpdate, userId]);
        await logAudit("Usuarios", userId, "ATUALIZACAO_PERFIL_PROPRIO", userId, fieldsToUpdate);
        const [updatedUserRows] = await pool.query("SELECT id, nome_usuario, nome_completo, email, perfil_apresentador, logo_empresa_path FROM Usuarios WHERE id = ?", [userId]);
        res.json({ message: "Perfil atualizado com sucesso!", user: updatedUserRows[0] });

    } catch (error) {
        console.error("Erro ao atualizar perfil do usuário:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Get all users (for admin or selection purposes)
const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query("SELECT id, nome_usuario, nome_completo, email, perfil_apresentador, criado_em, atualizado_em FROM Usuarios ORDER BY nome_completo ASC");
        res.json(users);
    } catch (error) {
        console.error("Erro ao buscar todos os usuários:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Get user by ID (for admin or selection purposes)
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await pool.query("SELECT id, nome_usuario, nome_completo, email, perfil_apresentador, criado_em, atualizado_em FROM Usuarios WHERE id = ?", [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        res.json(users[0]);
    } catch (error) {
        console.error("Erro ao buscar usuário por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Create a new user (admin functionality)
const createUser = async (req, res) => {
    const { nome_usuario, senha, nome_completo, email, perfil_apresentador } = req.body;
    const adminUserId = req.user.userId; // Assuming only admins can create users

    if (!nome_usuario || !senha || !nome_completo) {
        return res.status(400).json({ message: "Nome de usuário, senha e nome completo são obrigatórios." });
    }

    try {
        const [existingUserByUsername] = await pool.query("SELECT id FROM Usuarios WHERE nome_usuario = ?", [nome_usuario]);
        if (existingUserByUsername.length > 0) {
            return res.status(409).json({ message: "Nome de usuário já existe." });
        }
        if (email) {
            const [existingUserByEmail] = await pool.query("SELECT id FROM Usuarios WHERE email = ?", [email]);
            if (existingUserByEmail.length > 0) {
                return res.status(409).json({ message: "Email já está em uso." });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        const newUser = {
            nome_usuario,
            senha_hash,
            nome_completo,
            email: email || null,
            perfil_apresentador: perfil_apresentador || false,
            criado_por_id: adminUserId, // Log who created
            atualizado_por_id: adminUserId
        };

        const [result] = await pool.query("INSERT INTO Usuarios SET ?", newUser);
        const newUserId = result.insertId;

        await logAudit("Usuarios", newUserId, "CRIACAO_USUARIO", adminUserId, { nome_usuario, nome_completo, email, perfil_apresentador });
        
        const [createdUser] = await pool.query("SELECT id, nome_usuario, nome_completo, email, perfil_apresentador FROM Usuarios WHERE id = ?", [newUserId]);

        res.status(201).json({ message: "Usuário criado com sucesso!", user: createdUser[0] });
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update user by ID (admin functionality - for non-password fields)
const updateUserById = async (req, res) => {
    const { id } = req.params;
    const { nome_completo, email, perfil_apresentador } = req.body;
    const adminUserId = req.user.userId;

    try {
        const [userRows] = await pool.query("SELECT * FROM Usuarios WHERE id = ?", [id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        const userToUpdate = userRows[0];

        if (email && email !== userToUpdate.email) {
            const [existingUsers] = await pool.query("SELECT id FROM Usuarios WHERE email = ? AND id != ?", [email, id]);
            if (existingUsers.length > 0) {
                return res.status(409).json({ message: "Este email já está em uso por outro usuário." });
            }
        }

        const fieldsToUpdate = {};
        if (nome_completo !== undefined) fieldsToUpdate.nome_completo = nome_completo;
        if (email !== undefined) fieldsToUpdate.email = email;
        if (perfil_apresentador !== undefined) fieldsToUpdate.perfil_apresentador = perfil_apresentador;
        fieldsToUpdate.atualizado_por_id = adminUserId;

        if (Object.keys(fieldsToUpdate).length <= 1) { // Only atualizado_por_id means no actual data change
            return res.status(400).json({ message: "Nenhum dado válido fornecido para atualização." });
        }

        await pool.query("UPDATE Usuarios SET ? WHERE id = ?", [fieldsToUpdate, id]);
        await logAudit("Usuarios", id, "ATUALIZACAO_USUARIO_ADMIN", adminUserId, fieldsToUpdate);
        
        const [updatedUser] = await pool.query("SELECT id, nome_usuario, nome_completo, email, perfil_apresentador FROM Usuarios WHERE id = ?", [id]);
        res.json({ message: "Usuário atualizado com sucesso!", user: updatedUser[0] });

    } catch (error) {
        console.error("Erro ao atualizar usuário por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Change user password by ID (admin functionality)
const changeUserPasswordById = async (req, res) => {
    const { id } = req.params;
    const { nova_senha } = req.body;
    const adminUserId = req.user.userId;

    if (!nova_senha) {
        return res.status(400).json({ message: "Nova senha é obrigatória." });
    }

    try {
        const [userRows] = await pool.query("SELECT id FROM Usuarios WHERE id = ?", [id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }

        const salt = await bcrypt.genSalt(10);
        const senha_hash_nova = await bcrypt.hash(nova_senha, salt);

        await pool.query("UPDATE Usuarios SET senha_hash = ?, atualizado_por_id = ? WHERE id = ?", [senha_hash_nova, adminUserId, id]);
        await logAudit("Usuarios", id, "MUDANCA_SENHA_ADMIN", adminUserId, { userIdTarget: id });
        res.json({ message: "Senha do usuário atualizada com sucesso!" });

    } catch (error) {
        console.error("Erro ao alterar senha do usuário por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Delete user by ID (admin functionality)
const deleteUserById = async (req, res) => {
    const { id } = req.params;
    const adminUserId = req.user.userId;

    // Prevent admin from deleting themselves via this route
    if (parseInt(id, 10) === adminUserId) {
        return res.status(403).json({ message: "Administrador não pode excluir a própria conta através desta rota." });
    }

    try {
        const [userRows] = await pool.query("SELECT nome_usuario FROM Usuarios WHERE id = ?", [id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        const deletedUsername = userRows[0].nome_usuario;

        // Consider dependencies: what happens to records created by this user?
        // Foreign keys are set to SET NULL or CASCADE where appropriate in schema.sql
        const [result] = await pool.query("DELETE FROM Usuarios WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuário não encontrado para exclusão." });
        }

        await logAudit("Usuarios", id, "DELECAO_USUARIO_ADMIN", adminUserId, { deletedUsername });
        res.json({ message: `Usuário '${deletedUsername}' excluído com sucesso!` });

    } catch (error) {
        console.error("Erro ao excluir usuário por ID:", error);
        // Check for foreign key constraint errors if cascading is not fully handled or if there are other dependencies
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({ message: "Não é possível excluir este usuário pois ele está referenciado em outros registros. Verifique roteiros, eventos, etc.", error: error.message });
        }
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

module.exports = {
    getCurrentUserProfile,
    updateCurrentUserProfile,
    getAllUsers,
    getUserById,
    createUser,
    updateUserById,
    changeUserPasswordById,
    deleteUserById
};
