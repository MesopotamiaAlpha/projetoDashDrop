const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Rota pública para obter o logo institucional
router.get('/logo-institucional', async (req, res) => {
    try {
        // Buscar o logo do primeiro usuário admin ou apresentador que tenha um logo configurado
        const [users] = await pool.query(
            "SELECT logo_empresa_path FROM Usuarios WHERE logo_empresa_path IS NOT NULL AND logo_empresa_path != '' LIMIT 1"
        );
        
        if (users.length > 0 && users[0].logo_empresa_path) {
            return res.json({ logoPath: users[0].logo_empresa_path });
        } else {
            // Se nenhum logo for encontrado, retornar null
            return res.json({ logoPath: null });
        }
    } catch (error) {
        console.error("Erro ao buscar logo institucional:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
});

module.exports = router;
