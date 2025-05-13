const express = require("express");
const router = express.Router();
// Alteração na importação para tentar resolver o problema de undefined handler
const googleCalendarController = require("../controllers/googleCalendarController");
console.log("[DEBUG] Imported into googleCalendarRoutes.js:", googleCalendarController);
const { protect } = require("../middleware/authMiddleware");

// @route   GET /api/google-calendar/events
// @desc    Get events from Google Calendar
// @access  Private
// Alteração na chamada da função para usar o objeto importado diretamente
if (googleCalendarController && typeof googleCalendarController.getGoogleCalendarEvents === 'function') {
    router.get("/events", protect, googleCalendarController.getGoogleCalendarEvents);
} else {
    console.error("[DEBUG] ERROR: getGoogleCalendarEvents is not a function or googleCalendarController is undefined.");
    // Fallback ou tratamento de erro, se necessário, ou deixar que o erro ocorra para ser visível
}

module.exports = router;

