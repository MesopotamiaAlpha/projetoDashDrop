const { pool } = require("../config/db");
const { logAudit } = require("./authController");
const path = require("path");
const os = require("os");
const { generatePDF } = require("../pdf_generator");

// Create a new roteiro
const createRoteiro = async (req, res) => {
    const { nome, ano, mes, conteudo_principal, data_criacao_documento, tags, tipo_roteiro } = req.body; 
    const userId = req.user.userId;

    if (!nome || !ano || !mes) {
        return res.status(400).json({ message: "Nome, ano e mês do roteiro são obrigatórios." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(
            "INSERT INTO Roteiros (nome, ano, mes, conteudo_principal, data_criacao_documento, tipo_roteiro, usuario_id, criado_por_id, atualizado_por_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [nome, ano, mes, conteudo_principal, data_criacao_documento, tipo_roteiro, userId, userId, userId]
        );
        const newRoteiroId = result.insertId;

        if (tags && tags.length > 0) {
            const tagValues = tags.map(tagId => [newRoteiroId, tagId]);
            await connection.query("INSERT INTO RoteiroTags (roteiro_id, tag_id) VALUES ?", [tagValues]);
        }

        await logAudit("Roteiros", newRoteiroId, "CRIACAO", userId, { nome, ano, mes, tipo_roteiro, tags });
        await connection.commit();

        res.status(201).json({ 
            message: "Roteiro criado com sucesso!", 
            roteiroId: newRoteiroId, 
            nome, 
            ano, 
            mes,
            tipo_roteiro 
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao criar roteiro:", error);
        res.status(500).json({ message: "Erro interno do servidor ao criar roteiro.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get all roteiros (with filters for ano, mes, tags)
const getAllRoteiros = async (req, res) => {
    const { ano, mes, tagIds } = req.query; 
    let query = `
        SELECT r.id, r.nome, r.ano, r.mes, r.tipo_roteiro, r.data_criacao_documento, u.nome_usuario as criador_nome,
               GROUP_CONCAT(DISTINCT t.id SEPARATOR ",") as tag_ids,
               GROUP_CONCAT(DISTINCT t.nome SEPARATOR ",") as tag_nomes,
               GROUP_CONCAT(DISTINCT t.cor SEPARATOR ",") as tag_cores
        FROM Roteiros r
        LEFT JOIN Usuarios u ON r.usuario_id = u.id
        LEFT JOIN RoteiroTags rt ON r.id = rt.roteiro_id
        LEFT JOIN Tags t ON rt.tag_id = t.id
    `;
    const params = [];
    const conditions = [];

    if (ano) {
        conditions.push("r.ano = ?");
        params.push(ano);
    }
    if (mes) {
        conditions.push("r.mes = ?");
        params.push(mes);
    }
    if (tagIds) {
        const tagIdArray = tagIds.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (tagIdArray.length > 0) {
            query += ` JOIN RoteiroTags rt_filter ON r.id = rt_filter.roteiro_id AND rt_filter.tag_id IN (${tagIdArray.map(() => "?").join(",")}) `;
            params.push(...tagIdArray);
        }
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY r.id ORDER BY r.ano DESC, r.mes DESC, r.nome ASC";

    try {
        const [roteiros] = await pool.query(query, params);
        const result = roteiros.map(r => ({
            ...r,
            tags: r.tag_ids ? r.tag_ids.split(",").map((id, index) => ({
                id: parseInt(id),
                nome: r.tag_nomes.split(",")[index],
                cor: r.tag_cores.split(",")[index]
            })) : [],
            tag_ids: undefined, 
            tag_nomes: undefined,
            tag_cores: undefined
        }));
        res.json(result);
    } catch (error) {
        console.error("Erro ao buscar roteiros:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Get a specific roteiro by ID
const getRoteiroById = async (req, res) => {
    const { id } = req.params;
    try {
        const roteiro = await getRoteiroByIdForInternalUse(id);
        if (!roteiro) {
            return res.status(404).json({ message: "Roteiro não encontrado." });
        }
        res.json(roteiro);
    } catch (error) {
        console.error("Erro ao buscar roteiro por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update a roteiro by ID
const updateRoteiro = async (req, res) => {
    const { id } = req.params;
    const { nome, ano, mes, conteudo_principal, data_criacao_documento, tags, tipo_roteiro } = req.body; 
    const userId = req.user.userId;

    if (!nome && !ano && !mes && !conteudo_principal && !data_criacao_documento && !tags && !tipo_roteiro) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const fieldsToUpdate = {};
        if (nome !== undefined) fieldsToUpdate.nome = nome;
        if (ano !== undefined) fieldsToUpdate.ano = ano;
        if (mes !== undefined) fieldsToUpdate.mes = mes;
        if (conteudo_principal !== undefined) fieldsToUpdate.conteudo_principal = conteudo_principal;
        if (data_criacao_documento !== undefined) fieldsToUpdate.data_criacao_documento = data_criacao_documento;
        if (tipo_roteiro !== undefined) fieldsToUpdate.tipo_roteiro = tipo_roteiro;
        fieldsToUpdate.atualizado_por_id = userId;

        if (Object.keys(fieldsToUpdate).length > 1) { 
            await connection.query("UPDATE Roteiros SET ? WHERE id = ?", [fieldsToUpdate, id]);
        }

        if (tags !== undefined) { 
            await connection.query("DELETE FROM RoteiroTags WHERE roteiro_id = ?", [id]);
            if (tags.length > 0) {
                const tagValues = tags.map(tagId => [id, tagId]);
                await connection.query("INSERT INTO RoteiroTags (roteiro_id, tag_id) VALUES ?", [tagValues]);
            }
        }
        
        await logAudit("Roteiros", parseInt(id), "ATUALIZACAO", userId, { ...fieldsToUpdate, tags });
        await connection.commit();

        const updatedRoteiro = await getRoteiroByIdForInternalUse(id, connection);
        res.json({ message: "Roteiro atualizado com sucesso!", roteiro: updatedRoteiro });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar roteiro:", error);
        res.status(500).json({ message: "Erro interno do servidor ao atualizar roteiro.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

async function getRoteiroByIdForInternalUse(id, dbConnection) {
    const query = `
        SELECT r.*, u.nome_usuario as criador_nome,
               GROUP_CONCAT(DISTINCT t.id SEPARATOR ",") as tag_ids,
               GROUP_CONCAT(DISTINCT t.nome SEPARATOR ",") as tag_nomes,
               GROUP_CONCAT(DISTINCT t.cor SEPARATOR ",") as tag_cores
        FROM Roteiros r
        LEFT JOIN Usuarios u ON r.usuario_id = u.id
        LEFT JOIN RoteiroTags rt ON r.id = rt.roteiro_id
        LEFT JOIN Tags t ON rt.tag_id = t.id
        WHERE r.id = ?
        GROUP BY r.id
    `;
    const [roteiros] = await (dbConnection || pool).query(query, [id]);
    if (roteiros.length === 0) return null;
    const roteiro = roteiros[0];
    const pautas = await getCenasForRoteiroInternal(id, dbConnection || pool);
    return {
        ...roteiro,
        tags: roteiro.tag_ids ? roteiro.tag_ids.split(",").map((tag_id, index) => ({
            id: parseInt(tag_id),
            nome: roteiro.tag_nomes.split(",")[index],
            cor: roteiro.tag_cores.split(",")[index]
        })) : [],
        pautas: pautas,
        tag_ids: undefined,
        tag_nomes: undefined,
        tag_cores: undefined
    };
}


const deleteRoteiro = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        await connection.query("DELETE FROM CenasRoteiro WHERE roteiro_id = ?", [id]);
        const [result] = await connection.query("DELETE FROM Roteiros WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Roteiro não encontrado para exclusão." });
        }

        await logAudit("Roteiros", parseInt(id), "DELECAO", userId, { roteiroId: id });
        await connection.commit();

        res.status(200).json({ message: "Roteiro excluído com sucesso!" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao excluir roteiro:", error);
        res.status(500).json({ message: "Erro interno do servidor ao excluir roteiro.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// --- Cenas do Roteiro Controllers ---

const addCenaToRoteiro = async (req, res) => {
    const { roteiroId } = req.params;
    const { ordem, video, tec_transicao, audio, estilo_linha_json, colunas_personalizadas_json, localizacao, tipo_linha } = req.body;
    const userId = req.user.userId;

    try {
        const [roteiros] = await pool.query("SELECT id FROM Roteiros WHERE id = ?", [roteiroId]);
        if (roteiros.length === 0) {
            return res.status(404).json({ message: "Roteiro pai não encontrado." });
        }

        const [result] = await pool.query(
            "INSERT INTO CenasRoteiro (roteiro_id, ordem, video, tec_transicao, audio, estilo_linha_json, colunas_personalizadas_json, localizacao, tipo_linha, criado_por_id, atualizado_por_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [roteiroId, ordem || 0, video, tec_transicao, audio, estilo_linha_json, colunas_personalizadas_json, localizacao, tipo_linha, userId, userId]
        );
        const newCenaId = result.insertId;

        await logAudit("CenasRoteiro", newCenaId, "CRIACAO", userId, { roteiroId, video, tipo_linha });

        res.status(201).json({ message: "Linha adicionada com sucesso!", cenaId: newCenaId });
    } catch (error) {
        console.error("Erro ao adicionar linha ao roteiro:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

const getCenasForRoteiro = async (req, res) => {
    const { roteiroId } = req.params;
    try {
        const cenas = await getCenasForRoteiroInternal(roteiroId);
        res.json(cenas);
    } catch (error) {
        console.error("Erro ao buscar cenas do roteiro:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

async function getCenasForRoteiroInternal(roteiroId, dbConnection) {
    const [cenas] = await (dbConnection || pool).query("SELECT * FROM CenasRoteiro WHERE roteiro_id = ? ORDER BY ordem ASC", [roteiroId]);
    return cenas.map(c => ({
        ...c,
        estilo_linha_json: c.estilo_linha_json ? JSON.parse(c.estilo_linha_json) : null,
        colunas_personalizadas_json: c.colunas_personalizadas_json ? JSON.parse(c.colunas_personalizadas_json) : null
    }));
}

const getCenaById = async (req, res) => {
    const { roteiroId, cenaId } = req.params;
    try {
        const [cenas] = await pool.query("SELECT * FROM CenasRoteiro WHERE id = ? AND roteiro_id = ?", [cenaId, roteiroId]);
        if (cenas.length === 0) {
            return res.status(404).json({ message: "Cena não encontrada neste roteiro." });
        }
        const cena = cenas[0];
        res.json({
            ...cena,
            estilo_linha_json: cena.estilo_linha_json ? JSON.parse(cena.estilo_linha_json) : null,
            colunas_personalizadas_json: cena.colunas_personalizadas_json ? JSON.parse(cena.colunas_personalizadas_json) : null
        });
    } catch (error) {
        console.error("Erro ao buscar cena por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

const updateCenaInRoteiro = async (req, res) => {
    const { roteiroId, cenaId } = req.params;
    const { ordem, video, tec_transicao, audio, estilo_linha_json, colunas_personalizadas_json, localizacao, tipo_linha } = req.body;
    const userId = req.user.userId;

    const fieldsToUpdate = {};
    if (ordem !== undefined) fieldsToUpdate.ordem = ordem;
    if (video !== undefined) fieldsToUpdate.video = video;
    if (tec_transicao !== undefined) fieldsToUpdate.tec_transicao = tec_transicao;
    if (audio !== undefined) fieldsToUpdate.audio = audio;
    if (estilo_linha_json !== undefined) fieldsToUpdate.estilo_linha_json = JSON.stringify(estilo_linha_json);
    if (colunas_personalizadas_json !== undefined) fieldsToUpdate.colunas_personalizadas_json = JSON.stringify(colunas_personalizadas_json);
    if (localizacao !== undefined) fieldsToUpdate.localizacao = localizacao;
    if (tipo_linha !== undefined) fieldsToUpdate.tipo_linha = tipo_linha;
    fieldsToUpdate.atualizado_por_id = userId;

    if (Object.keys(fieldsToUpdate).length <= 1) { 
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização da linha." });
    }

    try {
        const [result] = await pool.query("UPDATE CenasRoteiro SET ? WHERE id = ? AND roteiro_id = ?", [fieldsToUpdate, cenaId, roteiroId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Linha não encontrada ou não pertence a este roteiro." });
        }
        await logAudit("CenasRoteiro", parseInt(cenaId), "ATUALIZACAO", userId, fieldsToUpdate);
        
        const [updatedCena] = await pool.query("SELECT * FROM CenasRoteiro WHERE id = ?", [cenaId]);
        res.json({
            message: "Linha atualizada com sucesso!", 
            cena: {
                ...updatedCena[0],
                estilo_linha_json: updatedCena[0].estilo_linha_json ? JSON.parse(updatedCena[0].estilo_linha_json) : null,
                colunas_personalizadas_json: updatedCena[0].colunas_personalizadas_json ? JSON.parse(updatedCena[0].colunas_personalizadas_json) : null
            }
        });
    } catch (error) {
        console.error("Erro ao atualizar linha:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

const deleteCenaFromRoteiro = async (req, res) => {
    const { roteiroId, cenaId } = req.params;
    const userId = req.user.userId;
    try {
        const [result] = await pool.query("DELETE FROM CenasRoteiro WHERE id = ? AND roteiro_id = ?", [cenaId, roteiroId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Linha não encontrada ou não pertence a este roteiro." });
        }
        await logAudit("CenasRoteiro", parseInt(cenaId), "DELECAO", userId, { roteiroId, cenaId });
        res.status(200).json({ message: "Linha excluída com sucesso!" });
    } catch (error) {
        console.error("Erro ao excluir linha:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

const exportRoteiroToPdf = async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`Iniciando exportação de PDF para roteiro ID: ${id}`);
        const roteiro = await getRoteiroByIdForInternalUse(id);
        if (!roteiro) {
            console.error(`Roteiro ID ${id} não encontrado no banco de dados`);
            return res.status(404).json({ message: "Roteiro não encontrado." });
        }
        
        console.log(`Roteiro encontrado: ${roteiro.nome}, processando dados para PDF`);
        
        // Definir colunas padrão caso não existam no conteudo_principal
        let colunasVisiveis = [];
        try {
            // Tentar extrair colunas do conteudo_principal se existir
            const conteudoPrincipal = roteiro.conteudo_principal ? JSON.parse(roteiro.conteudo_principal) : {};
            colunasVisiveis = conteudoPrincipal.colunas?.filter(col => col.id !== 'localizacao' && col.id !== 'acoes') || [];
        } catch (parseError) {
            console.error(`Erro ao analisar conteudo_principal: ${parseError.message}`);
        }
        
        // Se não houver colunas definidas, usar colunas padrão
        if (colunasVisiveis.length === 0) {
            console.log('Usando colunas padrão para o PDF');
            colunasVisiveis = [
                { id: 'video', nome: 'VÍDEO' },
                { id: 'tec_transicao', nome: 'TEC / TRANSIÇÃO' },
                { id: 'audio', nome: 'ÁUDIO' }
            ];
        }
        
        console.log(`Usando ${colunasVisiveis.length} colunas para o PDF`);
        
        // Adicionar colunasVisiveis ao objeto roteiro para uso na geração do PDF
        roteiro.colunasVisiveis = colunasVisiveis;

        // Usar a nova função de geração de PDF com FPDF
        console.log('Gerando PDF com FPDF...');
        try {
            const pdfBuffer = await generatePDF(null, roteiro);
            console.log(`PDF gerado com sucesso, tamanho: ${pdfBuffer.length} bytes`);
            
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="roteiro_${roteiro.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
            res.send(pdfBuffer);
        } catch (pdfError) {
            console.error("Erro ao gerar PDF com FPDF:", pdfError);
            res.status(500).json({ message: "Erro ao gerar PDF.", error: pdfError.message });
        }

    } catch (error) {
        console.error("Erro ao exportar roteiro para PDF:", error);
        res.status(500).json({ message: "Erro interno do servidor ao exportar PDF.", error: error.message });
    }
};


module.exports = {
    createRoteiro,
    getAllRoteiros,
    getRoteiroById,
    updateRoteiro,
    deleteRoteiro,
    addCenaToRoteiro,
    getCenasForRoteiro,
    getCenaById,
    updateCenaInRoteiro,
    deleteCenaFromRoteiro,
    exportRoteiroToPdf
};
