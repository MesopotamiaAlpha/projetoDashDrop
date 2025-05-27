const express = require("express");
const router = express.Router();
const calendarioController = require("../controllers/calendarioController");
const roteiroController = require("../controllers/roteiroController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Aplicar middleware de autenticação a todas as rotas
router.use(authenticateToken);

// Rotas para Eventos do Calendário
router.post("/eventos", calendarioController.createEvento);
router.get("/eventos", calendarioController.getAllEventos);
router.get("/eventos/:id", calendarioController.getEventoById);
router.put("/eventos/:id", calendarioController.updateEvento);
router.delete("/eventos/:id", calendarioController.deleteEvento);

// Rota para obter roteiros vinculados a um evento
router.get("/eventos/:eventoId/roteiros", roteiroController.getRoteirosForEvento);

module.exports = router;
