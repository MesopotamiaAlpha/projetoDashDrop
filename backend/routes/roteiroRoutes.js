const express = require("express");
const router = express.Router();
const roteiroController = require("../controllers/roteiroController");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/roteiros - Create a new roteiro
router.post("/", authenticateToken, roteiroController.createRoteiro);

// GET /api/roteiros - Get all roteiros (with filters for ano, mes, tags)
router.get("/", authenticateToken, roteiroController.getAllRoteiros);

// GET /api/roteiros/:id - Get a specific roteiro by ID
router.get("/:id", authenticateToken, roteiroController.getRoteiroById);

// PUT /api/roteiros/:id - Update a roteiro by ID
router.put("/:id", authenticateToken, roteiroController.updateRoteiro);

// DELETE /api/roteiros/:id - Delete a roteiro by ID
router.delete("/:id", authenticateToken, roteiroController.deleteRoteiro);

// --- Cenas do Roteiro --- (Nested under a specific roteiro)
// POST /api/roteiros/:roteiroId/cenas - Add a cena to a roteiro
router.post("/:roteiroId/cenas", authenticateToken, roteiroController.addCenaToRoteiro);

// GET /api/roteiros/:roteiroId/cenas - Get all cenas for a roteiro
router.get("/:roteiroId/cenas", authenticateToken, roteiroController.getCenasForRoteiro);

// GET /api/roteiros/:roteiroId/cenas/:cenaId - Get a specific cena by ID
router.get("/:roteiroId/cenas/:cenaId", authenticateToken, roteiroController.getCenaById);

// PUT /api/roteiros/:roteiroId/cenas/:cenaId - Update a cena by ID
router.put("/:roteiroId/cenas/:cenaId", authenticateToken, roteiroController.updateCenaInRoteiro);

// DELETE /api/roteiros/:roteiroId/cenas/:cenaId - Delete a cena by ID
router.delete("/:roteiroId/cenas/:cenaId", authenticateToken, roteiroController.deleteCenaFromRoteiro);

// PUT /api/roteiros/:roteiroId/cenas/reorder - Reorder cenas for a roteiro
router.put("/:roteiroId/cenas/reorder", authenticateToken, roteiroController.reorderCenas);


module.exports = router;
