const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    console.log("\n[AuthMiddleware] Recebida requisição para:", req.method, req.originalUrl);
    const authHeader = req.headers["authorization"];
    console.log("[AuthMiddleware] Cabeçalho Authorization:", authHeader);

    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    console.log("[AuthMiddleware] Token extraído:", token);

    if (token == null) {
        console.log("[AuthMiddleware] Token não fornecido ou nulo.");
        return res.status(401).json({ message: "Authentication token required." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("[AuthMiddleware] JWT verification error:", err.message, "| Nome do erro:", err.name);
            if (err.name === "TokenExpiredError") {
                return res.status(403).json({ message: "Token expired." });
            }
            // Para erros como JsonWebTokenError (que inclui malformed jwt), o status 403 é apropriado.
            return res.status(403).json({ message: "Invalid token.", error_details: err.message });
        }
        console.log("[AuthMiddleware] Token verificado com sucesso. Usuário:", user);
        req.user = user; // Add user payload to request object
        next();
    });
};

module.exports = {
    authenticateToken,
};
