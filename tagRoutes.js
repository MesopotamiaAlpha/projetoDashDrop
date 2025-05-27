const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const { 
    createTag,
    getAllTags,
    getTagById,
    updateTag,
    deleteTag 
} = require("../controllers/tagController");

// Rotas para Tags
router.route("/")
    .post(authenticateToken, createTag)   // Criar nova tag
    .get(authenticateToken, getAllTags);    // Obter todas as tags

router.route("/:id")
    .get(authenticateToken, getTagById)     // Obter tag por ID
    .put(authenticateToken, updateTag)      // Atualizar tag por ID
    .delete(authenticateToken, deleteTag);  // Excluir tag por ID

module.exports = router;

