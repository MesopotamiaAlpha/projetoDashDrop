const express = require("express");
const router = express.Router();
const equipamentoController = require("../controllers/equipamentoController");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/equipamentos - Create a new equipamento
router.post("/", authenticateToken, equipamentoController.createEquipamento);

// GET /api/equipamentos - Get all equipamentos
router.get("/", authenticateToken, equipamentoController.getAllEquipamentos);

// GET /api/equipamentos/:id - Get a specific equipamento by ID
router.get("/:id", authenticateToken, equipamentoController.getEquipamentoById);

// PUT /api/equipamentos/:id - Update an equipamento by ID
router.put("/:id", authenticateToken, equipamentoController.updateEquipamento);

// DELETE /api/equipamentos/:id - Delete an equipamento by ID
router.delete("/:id", authenticateToken, equipamentoController.deleteEquipamento);

module.exports = router;
