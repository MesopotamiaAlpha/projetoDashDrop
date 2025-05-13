const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tagController");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /api/tags - Create a new tag
router.post("/", authenticateToken, tagController.createTag);

// GET /api/tags - Get all tags
router.get("/", authenticateToken, tagController.getAllTags);

// GET /api/tags/:id - Get a specific tag by ID
router.get("/:id", authenticateToken, tagController.getTagById);

// PUT /api/tags/:id - Update a tag by ID
router.put("/:id", authenticateToken, tagController.updateTag);

// DELETE /api/tags/:id - Delete a tag by ID
router.delete("/:id", authenticateToken, tagController.deleteTag);

module.exports = router;
