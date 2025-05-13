const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Rotas de Perfil do Usuário Logado
router.get("/me", authenticateToken, userController.getCurrentUserProfile);
router.put("/me/profile", authenticateToken, userController.updateCurrentUserProfile);

// Rotas de Gerenciamento de Usuários (idealmente, protegidas por um middleware de admin no futuro)

// POST /api/users - Criar um novo usuário
router.post("/", authenticateToken, userController.createUser);

// GET /api/users - Listar todos os usuários
router.get("/", authenticateToken, userController.getAllUsers);

// GET /api/users/:id - Obter usuário por ID
router.get("/:id", authenticateToken, userController.getUserById);

// PUT /api/users/:id - Atualizar perfil do usuário por ID (sem alterar senha)
router.put("/:id", authenticateToken, userController.updateUserById);

// PUT /api/users/:id/change-password - Alterar senha do usuário por ID
router.put("/:id/change-password", authenticateToken, userController.changeUserPasswordById);

// DELETE /api/users/:id - Excluir usuário por ID
router.delete("/:id", authenticateToken, userController.deleteUserById);

module.exports = router;
