const express = require("express");
const router = express.Router();
const calendarioController = require("../controllers/calendarioController");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/calendario/eventos - Create a new calendar event
router.post("/eventos", authenticateToken, calendarioController.createEvento);

// GET /api/calendario/eventos - Get all calendar events (with filters)
router.get("/eventos", authenticateToken, calendarioController.getAllEventos);

// GET /api/calendario/eventos/:id - Get a specific calendar event by ID
router.get("/eventos/:id", authenticateToken, calendarioController.getEventoById);

// PUT /api/calendario/eventos/:id - Update a calendar event by ID
router.put("/eventos/:id", authenticateToken, calendarioController.updateEvento);

// DELETE /api/calendario/eventos/:id - Delete a calendar event by ID
router.delete("/eventos/:id", authenticateToken, calendarioController.deleteEvento);

module.exports = router;
