const express = require("express");
const router = express.Router();
const checklistController = require("../controllers/checklistController");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/checklists - Create a new checklist for a gravação
router.post("/", authenticateToken, checklistController.createChecklist);

// GET /api/checklists - Get all checklists
router.get("/", authenticateToken, checklistController.getAllChecklists);

// GET /api/checklists/:id - Get a specific checklist by ID (including its items)
router.get("/:id", authenticateToken, checklistController.getChecklistById);

// PUT /api/checklists/:id - Update a checklist by ID (e.g., change name, associated event, or its items)
router.put("/:id", authenticateToken, checklistController.updateChecklist);

// DELETE /api/checklists/:id - Delete a checklist by ID
router.delete("/:id", authenticateToken, checklistController.deleteChecklist);

// // --- Checklist Items (Managed as part of the checklist update or specific endpoints if needed) ---
// // POST /api/checklists/:checklistId/items - Add an item to a checklist (handled in updateChecklist or a dedicated controller)
// router.post("/:checklistId/items", authenticateToken, checklistController.addItemToChecklist);

// // PUT /api/checklists/:checklistId/items/:itemId - Update an item in a checklist
// router.put("/:checklistId/items/:itemId", authenticateToken, checklistController.updateItemInChecklist);

// // DELETE /api/checklists/:checklistId/items/:itemId - Remove an item from a checklist
// router.delete("/:checklistId/items/:itemId", authenticateToken, checklistController.removeItemFromChecklist);

module.exports = router;
