require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool, testConnection } = require("./config/db");

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const roteiroRoutes = require('./routes/roteiroRoutes');
const tagRoutes = require('./routes/tagRoutes');
const calendarioRoutes = require('./routes/calendarioRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const checklistRoutes = require("./routes/checklistRoutes");
const publicRoutes = require('./routes/publicRoutes');
const equipamentosRoutes = require('./routes/equipamentosRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Database connection test
testConnection();

// Basic Route
app.get("/", (req, res) => {
    res.json({ message: "Welcome to Produtora Audiovisual Platform API" });
});

// Configurar rotas
app.use('/api/auth', authRoutes);
app.use('/api/roteiros', roteiroRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/equipamentos', equipamentosRoutes);

// Global Error Handler (simple version)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: "Something broke!", details: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // For potential testing

