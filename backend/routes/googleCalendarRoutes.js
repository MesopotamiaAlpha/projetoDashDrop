const express = require("express");
const router = express.Router();
const googleCalendarController = require("../controllers/googleCalendarController");
console.log("[DEBUG] Imported into googleCalendarRoutes.js (controller):");
console.dir(googleCalendarController, { depth: null });

const authMiddleware = require("../middleware/authMiddleware");
console.log("[DEBUG] Imported into googleCalendarRoutes.js (authMiddleware):");
console.dir(authMiddleware, { depth: null });

// @route   GET /api/google-calendar/events
// @desc    Get events from Google Calendar
// @access  Private
if (googleCalendarController && typeof googleCalendarController.getGoogleCalendarEvents === 'function') {
    console.log("[DEBUG] googleCalendarController.getGoogleCalendarEvents is a function. Type:", typeof googleCalendarController.getGoogleCalendarEvents);
    if (authMiddleware && typeof authMiddleware.protect === 'function'){
        console.log("[DEBUG] authMiddleware.protect is a function. Type:", typeof authMiddleware.protect);
        // Usando o middleware protect
        // router.get("/events", authMiddleware.protect, googleCalendarController.getGoogleCalendarEvents);
        
        // TESTE: Comentando o middleware protect temporariamente
        console.log("[DEBUG] Temporarily running /events route WITHOUT 'protect' middleware for testing.");
        router.get("/events", googleCalendarController.getGoogleCalendarEvents);
    } else {
        console.error("[DEBUG] ERROR: authMiddleware.protect is NOT a function or authMiddleware is undefined. Type:", typeof authMiddleware?.protect);
        // Fallback para rodar sem protect se ele estiver com problema, para isolar o erro
        console.log("[DEBUG] Fallback: Running /events route WITHOUT 'protect' middleware due to an issue with it.");
        router.get("/events", googleCalendarController.getGoogleCalendarEvents);
    }
} else {
    console.error("[DEBUG] ERROR: getGoogleCalendarEvents is NOT a function or googleCalendarController is undefined. Type:", typeof googleCalendarController?.getGoogleCalendarEvents);
}

module.exports = router;

