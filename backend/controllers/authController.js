const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function for audit logging (to be expanded or moved to a dedicated service)
async function logAudit(tabela_afetada, registro_afetado_id, acao_realizada, usuario_id, detalhes_alteracao = null) {
    try {
        const [result] = await pool.query(
            "INSERT INTO LogsAuditoria (tabela_afetada, registro_afetado_id, acao_realizada, usuario_id, detalhes_alteracao) VALUES (?, ?, ?, ?, ?)",
            [tabela_afetada, registro_afetado_id, acao_realizada, usuario_id, detalhes_alteracao ? JSON.stringify(detalhes_alteracao) : null]
        );
        console.log("Audit log created, ID:", result.insertId);
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // In a real app, you might want to handle this more robustly, 
        // e.g., retry, or log to a fallback system if DB logging fails.
    }
}

const registerUser = async (req, res) => {
    const { nome_usuario, senha, nome_completo, email, perfil_apresentador } = req.body;

    if (!nome_usuario || !senha || !email) {
        return res.status(400).json({ message: "Nome de usuário, senha e email são obrigatórios." });
    }

    try {
        // Check if user already exists
        const [existingUsers] = await pool.query("SELECT id FROM Usuarios WHERE nome_usuario = ? OR email = ?", [nome_usuario, email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: "Usuário ou email já cadastrado." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // Insert user into database
        const [result] = await pool.query(
            "INSERT INTO Usuarios (nome_usuario, senha_hash, nome_completo, email, perfil_apresentador) VALUES (?, ?, ?, ?, ?)",
            [nome_usuario, senha_hash, nome_completo, email, perfil_apresentador || false]
        );

        const novoUsuarioId = result.insertId;
        await logAudit("Usuarios", novoUsuarioId, "CRIACAO", novoUsuarioId, { nome_usuario, email });

        res.status(201).json({ message: "Usuário registrado com sucesso!", userId: novoUsuarioId });

    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        res.status(500).json({ message: "Erro interno do servidor ao registrar usuário.", error: error.message });
    }
};

const loginUser = async (req, res) => {
    const { nome_usuario, senha } = req.body;

    if (!nome_usuario || !senha) {
        return res.status(400).json({ message: "Nome de usuário e senha são obrigatórios." });
    }

    try {
        // Check if user exists
        const [users] = await pool.query("SELECT * FROM Usuarios WHERE nome_usuario = ?", [nome_usuario]);
        if (users.length === 0) {
            return res.status(401).json({ message: "Credenciais inválidas." }); // User not found
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(senha, user.senha_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Credenciais inválidas." }); // Password incorrect
        }

        // User authenticated, create JWT
        const payload = {
            userId: user.id,
            nome_usuario: user.nome_usuario,
            // Add other user details you might need in the token, e.g., role
            // perfil_apresentador: user.perfil_apresentador 
            // For this project, all users have full permissions once logged in, so user.id is enough for now.
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" }); // Token expires in 12 hours

        res.json({
            message: "Login bem-sucedido!",
            token,
            user: {
                id: user.id,
                nome_usuario: user.nome_usuario,
                nome_completo: user.nome_completo,
                email: user.email,
                perfil_apresentador: user.perfil_apresentador
            }
        });

    } catch (error) {
        console.error("Erro ao fazer login:", error);
        res.status(500).json({ message: "Erro interno do servidor ao fazer login.", error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logAudit // Exporting logAudit to be used by other controllers
};
