const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/authMiddleware');
const { pool } = require('../config/db');
const { logAudit } = require('../controllers/authController');

// Configuração do Multer para armazenamento de logos
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/logos');
        // Garantir que o diretório existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Usar userId para garantir unicidade e sobrescrever logos antigos do mesmo usuário
        const userId = req.user.userId;
        const fileExt = path.extname(file.originalname);
        const fileName = `logo_${userId}_${Date.now()}${fileExt}`;
        cb(null, fileName);
    }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não suportado. Apenas JPEG, JPG, PNG e GIF são permitidos.'), false);
    }
};

const upload = multer({
    storage: logoStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
});

// Rota para upload de logo
router.post('/logo', authenticateToken, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado ou tipo de arquivo inválido.' });
        }

        const userId = req.user.userId;
        // Caminho relativo para acesso via API
        const logoPath = `/api/uploads/logos/${req.file.filename}`;

        // Atualizar o caminho do logo no banco de dados
        const [userRows] = await pool.query("SELECT logo_empresa_path FROM Usuarios WHERE id = ?", [userId]);
        const oldLogoPath = userRows[0]?.logo_empresa_path;

        await pool.query("UPDATE Usuarios SET logo_empresa_path = ?, atualizado_por_id = ? WHERE id = ?", 
            [logoPath, userId, userId]);
        
        await logAudit("Usuarios", userId, "UPLOAD_LOGO", userId, { oldLogoPath, newLogoPath: logoPath });

        // Se houver um logo antigo, remover o arquivo (opcional)
        if (oldLogoPath) {
            const oldFileName = path.basename(oldLogoPath);
            const oldFilePath = path.join(__dirname, '../uploads/logos', oldFileName);
            
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        res.status(200).json({ 
            message: 'Logo enviado com sucesso!', 
            filePath: logoPath 
        });
    } catch (error) {
        console.error("Erro ao fazer upload do logo:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
});

// Rota para servir os arquivos de logo
router.get('/logos/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/logos', filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Arquivo não encontrado.' });
    }
});

module.exports = router;
