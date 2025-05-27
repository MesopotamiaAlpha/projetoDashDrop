const { pool } = require("../config/db");
const { logAudit } = require("./authController");
const PDFDocument = require("pdfkit"); // Assuming pdfkit is used now
const fs = require("fs");
const path = require("path");
const os = require("os");
const { generatePdf } = require("../pdf_generator"); // Assuming pdf_generator.js is in root

// Helper function to get tags for multiple cenas
async function getTagsForCenas(cenaIds, dbConnection) {
    if (!cenaIds || cenaIds.length === 0) {
        return {};
    }
    const placeholders = cenaIds.map(() => "?").join(",");
    const query = `
        SELECT ct.cena_id, t.id, t.nome, t.cor
        FROM CenaTags ct
        JOIN Tags t ON ct.tag_id = t.id
        WHERE ct.cena_id IN (${placeholders})
    `;
    const [tagsResult] = await (dbConnection || pool).query(query, cenaIds);
    
    const tagsByCenaId = {};
    tagsResult.forEach(row => {
        if (!tagsByCenaId[row.cena_id]) {
            tagsByCenaId[row.cena_id] = [];
        }
        tagsByCenaId[row.cena_id].push({ id: row.id, nome: row.nome, cor: row.cor });
    });
    return tagsByCenaId;
}

// Helper function to update tags for a single cena
async function updateTagsForCena(cenaId, tagIds, dbConnection) {
    const connection = dbConnection || await pool.getConnection();
    try {
        if (!dbConnection) await connection.beginTransaction(); // Start transaction only if not already in one
        
        // Delete existing tags for the cena
        await connection.query("DELETE FROM CenaTags WHERE cena_id = ?", [cenaId]);
        
        // Insert new tags if provided
        if (tagIds && tagIds.length > 0) {
            const values = tagIds.map(tagId => [cenaId, tagId]);
            await connection.query("INSERT INTO CenaTags (cena_id, tag_id) VALUES ?", [values]);
        }
        
        if (!dbConnection) await connection.commit(); // Commit only if we started the transaction here
    } catch (error) {
        if (!dbConnection && connection) await connection.rollback();
        console.error(`Erro ao atualizar tags para cena ${cenaId}:`, error);
        throw error; // Re-throw error to be caught by the calling function
    } finally {
        if (!dbConnection && connection) connection.release();
    }
}

// Create a new roteiro
const createRoteiro = async (req, res) => {
    // Added evento_id to destructuring
    const { nome, ano, mes, conteudo_principal, data_criacao_documento, tags, tipo_roteiro, evento_id } = req.body; 
    const userId = req.user.userId;

    if (!nome || !ano || !mes) {
        return res.status(400).json({ message: "Nome, ano e mês do roteiro são obrigatórios." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(
            // Added evento_id to insert query
            "INSERT INTO Roteiros (nome, ano, mes, conteudo_principal, data_criacao_documento, tipo_roteiro, usuario_id, criado_por_id, atualizado_por_id, evento_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [nome, ano, mes, conteudo_principal, data_criacao_documento, tipo_roteiro, userId, userId, userId, evento_id || null]
        );
        const newRoteiroId = result.insertId;

        // Handle Roteiro-level tags (if still needed)
        if (tags && tags.length > 0) {
            const tagValues = tags.map(tagId => [newRoteiroId, tagId]);
            await connection.query("INSERT INTO RoteiroTags (roteiro_id, tag_id) VALUES ?", [tagValues]);
        }

        await logAudit("Roteiros", newRoteiroId, "CRIACAO", userId, { nome, ano, mes, tipo_roteiro, tags, evento_id });
        await connection.commit();

        res.status(201).json({ 
            message: "Roteiro criado com sucesso!", 
            roteiroId: newRoteiroId, 
            nome, 
            ano, 
            mes,
            tipo_roteiro,
            evento_id // Return evento_id
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
        SELECT r.id, r.nome, r.ano, r.mes, r.tipo_roteiro, r.data_criacao_documento, r.evento_id, u.nome_usuario as criador_nome,
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
            // Ensure filtering works correctly even if a roteiro has no tags
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
                // Handle potential nulls if a roteiro has tags but some tag details are missing (unlikely with joins)
                nome: r.tag_nomes ? r.tag_nomes.split(",")[index] : null,
                cor: r.tag_cores ? r.tag_cores.split(",")[index] : null
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
    // Added evento_id
    const { nome, ano, mes, conteudo_principal, data_criacao_documento, tags, tipo_roteiro, evento_id } = req.body; 
    const userId = req.user.userId;

    // Check if at least one field is provided
    if (nome === undefined && ano === undefined && mes === undefined && conteudo_principal === undefined && data_criacao_documento === undefined && tags === undefined && tipo_roteiro === undefined && evento_id === undefined) {
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
        if (evento_id !== undefined) fieldsToUpdate.evento_id = evento_id || null; // Handle unsetting
        fieldsToUpdate.atualizado_por_id = userId;

        if (Object.keys(fieldsToUpdate).length > 1) { // Only update if there are fields other than atualizado_por_id
            await connection.query("UPDATE Roteiros SET ? WHERE id = ?", [fieldsToUpdate, id]);
        }

        // Handle Roteiro-level tags (if still needed)
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

// Internal function to get roteiro details, including cenas with their tags
async function getRoteiroByIdForInternalUse(id, dbConnection) {
    const connection = dbConnection || pool;
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
    const [roteiros] = await connection.query(query, [id]);
    if (roteiros.length === 0) return null;
    const roteiro = roteiros[0];
    
    // Fetch cenas and their associated tags
    const pautas = await getCenasForRoteiroInternal(id, connection);
    
    return {
        ...roteiro,
        // Roteiro-level tags
        tags: roteiro.tag_ids ? roteiro.tag_ids.split(",").map((tag_id, index) => ({
            id: parseInt(tag_id),
            nome: roteiro.tag_nomes ? roteiro.tag_nomes.split(",")[index] : null,
            cor: roteiro.tag_cores ? roteiro.tag_cores.split(",")[index] : null
        })) : [],
        pautas: pautas, // Cenas now include their tags
        // Clean up aggregated fields
        tag_ids: undefined,
        tag_nomes: undefined,
        tag_cores: undefined
    };
}

// Delete a roteiro
const deleteRoteiro = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Need to delete CenaTags before deleting CenasRoteiro
        const [cenaIdsResult] = await connection.query("SELECT id FROM CenasRoteiro WHERE roteiro_id = ?", [id]);
        const cenaIds = cenaIdsResult.map(c => c.id);
        if (cenaIds.length > 0) {
            await connection.query("DELETE FROM CenaTags WHERE cena_id IN (?)", [cenaIds]);
        }
        
        await connection.query("DELETE FROM CenasRoteiro WHERE roteiro_id = ?", [id]);
        await connection.query("DELETE FROM RoteiroTags WHERE roteiro_id = ?", [id]); // Delete roteiro-level tags too
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

// Add a cena (line) to a roteiro, now includes tags
const addCenaToRoteiro = async (req, res) => {
    const { roteiroId } = req.params;
    // Added tagIds to destructuring
    const { ordem, video, tec_transicao, audio, estilo_linha_json, colunas_personalizadas_json, localizacao, tipo_linha, nome_divisao, tagIds } = req.body;
    const userId = req.user.userId;
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        const [roteiros] = await connection.query("SELECT id FROM Roteiros WHERE id = ?", [roteiroId]);
        if (roteiros.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Roteiro pai não encontrado." });
        }

        const [result] = await connection.query(
            "INSERT INTO CenasRoteiro (roteiro_id, ordem, video, tec_transicao, audio, estilo_linha_json, colunas_personalizadas_json, localizacao, tipo_linha, nome_divisao, criado_por_id, atualizado_por_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [roteiroId, ordem ?? 0, video, tec_transicao, audio, estilo_linha_json ? JSON.stringify(estilo_linha_json) : null, colunas_personalizadas_json ? JSON.stringify(colunas_personalizadas_json) : null, localizacao, tipo_linha || 'pauta', nome_divisao, userId, userId]
        );
        const newCenaId = result.insertId;

        // Update tags for the new cena
        await updateTagsForCena(newCenaId, tagIds, connection);

        await logAudit("CenasRoteiro", newCenaId, "CRIACAO", userId, { roteiroId, video, tipo_linha, tagIds });
        await connection.commit();

        res.status(201).json({ message: "Linha adicionada com sucesso!", cenaId: newCenaId });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao adicionar linha ao roteiro:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Get all cenas for a roteiro, now includes tags for each cena
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

// Internal function to get cenas, now fetches and attaches tags
async function getCenasForRoteiroInternal(roteiroId, dbConnection) {
    const connection = dbConnection || pool;
    const [cenasResult] = await connection.query("SELECT * FROM CenasRoteiro WHERE roteiro_id = ? ORDER BY ordem ASC", [roteiroId]);
    
    if (cenasResult.length === 0) {
        return [];
    }
    
    const cenaIds = cenasResult.map(c => c.id);
    const tagsByCenaId = await getTagsForCenas(cenaIds, connection);
    
    return cenasResult.map(c => ({
        ...c,
        estilo_linha_json: c.estilo_linha_json ? JSON.parse(c.estilo_linha_json) : null,
        colunas_personalizadas_json: c.colunas_personalizadas_json ? JSON.parse(c.colunas_personalizadas_json) : null,
        tags: tagsByCenaId[c.id] || [] // Attach tags to each cena
    }));
}

// Get a specific cena by ID, now includes its tags
const getCenaById = async (req, res) => {
    const { roteiroId, cenaId } = req.params;
    try {
        const [cenas] = await pool.query("SELECT * FROM CenasRoteiro WHERE id = ? AND roteiro_id = ?", [cenaId, roteiroId]);
        if (cenas.length === 0) {
            return res.status(404).json({ message: "Cena não encontrada neste roteiro." });
        }
        const cena = cenas[0];
        
        // Fetch tags for this specific cena
        const tagsByCenaId = await getTagsForCenas([cenaId]);
        
        res.json({
            ...cena,
            estilo_linha_json: cena.estilo_linha_json ? JSON.parse(cena.estilo_linha_json) : null,
            colunas_personalizadas_json: cena.colunas_personalizadas_json ? JSON.parse(cena.colunas_personalizadas_json) : null,
            tags: tagsByCenaId[cenaId] || [] // Attach tags
        });
    } catch (error) {
        console.error("Erro ao buscar cena por ID:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    }
};

// Update a cena in a roteiro, now includes updating tags
const updateCenaInRoteiro = async (req, res) => {
    const { roteiroId, cenaId } = req.params;
    // Added tagIds
    const { ordem, video, tec_transicao, audio, estilo_linha_json, colunas_personalizadas_json, localizacao, tipo_linha, nome_divisao, tagIds } = req.body;
    const userId = req.user.userId;
    let connection;

    const fieldsToUpdate = {};
    if (ordem !== undefined) fieldsToUpdate.ordem = ordem;
    if (video !== undefined) fieldsToUpdate.video = video;
    if (tec_transicao !== undefined) fieldsToUpdate.tec_transicao = tec_transicao;
    if (audio !== undefined) fieldsToUpdate.audio = audio;
    if (estilo_linha_json !== undefined) fieldsToUpdate.estilo_linha_json = JSON.stringify(estilo_linha_json);
    if (colunas_personalizadas_json !== undefined) fieldsToUpdate.colunas_personalizadas_json = JSON.stringify(colunas_personalizadas_json);
    if (localizacao !== undefined) fieldsToUpdate.localizacao = localizacao;
    if (tipo_linha !== undefined) fieldsToUpdate.tipo_linha = tipo_linha;
    if (nome_divisao !== undefined) fieldsToUpdate.nome_divisao = nome_divisao;
    fieldsToUpdate.atualizado_por_id = userId;

    // Check if there's anything to update besides tags
    const hasOtherUpdates = Object.keys(fieldsToUpdate).length > 1;
    
    // Check if tags need updating
    const tagsNeedUpdate = tagIds !== undefined; 

    if (!hasOtherUpdates && !tagsNeedUpdate) {
        return res.status(400).json({ message: "Nenhum dado fornecido para atualização da linha." });
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (hasOtherUpdates) {
            const [result] = await connection.query("UPDATE CenasRoteiro SET ? WHERE id = ? AND roteiro_id = ?", [fieldsToUpdate, cenaId, roteiroId]);
            if (result.affectedRows === 0 && !tagsNeedUpdate) { // If only other fields failed and no tags to update
                await connection.rollback();
                return res.status(404).json({ message: "Linha não encontrada ou não pertence a este roteiro." });
            }
        }
        
        // Update tags if provided
        if (tagsNeedUpdate) {
            await updateTagsForCena(cenaId, tagIds, connection);
        }

        await logAudit("CenasRoteiro", parseInt(cenaId), "ATUALIZACAO", userId, { ...fieldsToUpdate, tagIds });
        await connection.commit();
        
        // Fetch the updated cena with its tags
        const [updatedCenaResult] = await connection.query("SELECT * FROM CenasRoteiro WHERE id = ?", [cenaId]);
        const updatedCena = updatedCenaResult[0];
        const updatedTags = await getTagsForCenas([cenaId], connection);

        res.json({
            message: "Linha atualizada com sucesso!", 
            cena: {
                ...updatedCena,
                estilo_linha_json: updatedCena.estilo_linha_json ? JSON.parse(updatedCena.estilo_linha_json) : null,
                colunas_personalizadas_json: updatedCena.colunas_personalizadas_json ? JSON.parse(updatedCena.colunas_personalizadas_json) : null,
                tags: updatedTags[cenaId] || []
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao atualizar linha:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Delete a cena from a roteiro, now also deletes associated tags
const deleteCenaFromRoteiro = async (req, res) => {
    const { roteiroId, cenaId } = req.params;
    const userId = req.user.userId;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Delete associated tags first
        await connection.query("DELETE FROM CenaTags WHERE cena_id = ?", [cenaId]);
        
        // Then delete the cena
        const [result] = await connection.query("DELETE FROM CenasRoteiro WHERE id = ? AND roteiro_id = ?", [cenaId, roteiroId]);
        
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Linha não encontrada ou não pertence a este roteiro." });
        }
        
        await logAudit("CenasRoteiro", parseInt(cenaId), "DELECAO", userId, { roteiroId, cenaId });
        await connection.commit();
        
        res.status(200).json({ message: "Linha excluída com sucesso!" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erro ao excluir linha:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// --- PDF Export ---
const exportRoteiroToPdf = async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`[PDF EXPORT] Iniciando exportação para roteiro ID: ${id}`);
        const roteiro = await getRoteiroByIdForInternalUse(id);
        if (!roteiro) {
            console.error(`[PDF EXPORT] Roteiro ID ${id} não encontrado.`);
            return res.status(404).json({ message: "Roteiro não encontrado." });
        }
        
        console.log(`[PDF EXPORT] Roteiro "${roteiro.nome}" encontrado. Processando ${roteiro.pautas?.length || 0} linhas.`);
        
        // --- Preparar dados para PDF --- 
        const dataForPdf = {
            nome: roteiro.nome,
            tipo_roteiro: roteiro.tipo_roteiro,
            ano: roteiro.ano,
            mes: roteiro.mes,
            data_criacao_documento: roteiro.data_criacao_documento,
            logo_empresa_url: null, // Precisamos buscar o logo do usuário criador
            cenas: roteiro.pautas || [], // pautas agora contém as tags
            colunas: [ // Definir colunas que vão para o PDF
                // { header: 'LOCALIZAÇÃO', field: 'localizacao', width: 100 }, // Localização não vai para o PDF por padrão, mas pode ter tags
                { header: 'VÍDEO', field: 'video', width: 200 },
                { header: 'TEC / TRANSIÇÃO', field: 'tec_transicao', width: 100 },
                { header: 'ÁUDIO', field: 'audio', width: 200 },
                { header: 'TAGS', field: 'tags', width: 80 } // Nova coluna para Tags
            ],
            tagsLegenda: [] // Será populado com tags únicas usadas
        };

        // Buscar logo do usuário criador
        if (roteiro.usuario_id) {
            try {
                const [user] = await pool.query("SELECT logo_empresa_path FROM Usuarios WHERE id = ?", [roteiro.usuario_id]);
                if (user.length > 0 && user[0].logo_empresa_path) {
                    // Construir caminho absoluto se necessário (depende de como está salvo)
                    // Assumindo que está salvo relativo à pasta 'uploads' no backend
                    const logoPath = path.join(__dirname, '..', user[0].logo_empresa_path); 
                    if (fs.existsSync(logoPath)) {
                         dataForPdf.logo_empresa_url = logoPath;
                         console.log(`[PDF EXPORT] Logo encontrado: ${logoPath}`);
                    } else {
                         console.warn(`[PDF EXPORT] Logo path não encontrado no sistema de arquivos: ${logoPath}`);
                    }
                }
            } catch (logoError) {
                console.error("[PDF EXPORT] Erro ao buscar logo do usuário:", logoError);
            }
        }
        
        // Coletar tags únicas para a legenda
        const uniqueTags = {};
        dataForPdf.cenas.forEach(cena => {
            if (cena.tags && cena.tags.length > 0) {
                cena.tags.forEach(tag => {
                    if (!uniqueTags[tag.id]) {
                        uniqueTags[tag.id] = { nome: tag.nome, cor: tag.cor };
                    }
                });
            }
        });
        dataForPdf.tagsLegenda = Object.values(uniqueTags).sort((a, b) => a.nome.localeCompare(b.nome));
        console.log(`[PDF EXPORT] Tags únicas para legenda: ${dataForPdf.tagsLegenda.length}`);

        // --- Gerar PDF usando PDFKit --- 
        const tempDir = path.join(os.tmpdir(), 'roteiro_pdfs');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const safeNome = (roteiro.nome || 'roteiro').replace(/[^a-zA-Z0-9]/g, '_');
        const outputPath = path.join(tempDir, `roteiro_${safeNome}_${Date.now()}.pdf`);
        
        console.log(`[PDF EXPORT] Gerando PDF em: ${outputPath}`);
        
        await generatePdf(dataForPdf, outputPath); // Chamar a função do pdf_generator
        
        console.log(`[PDF EXPORT] PDF gerado com sucesso. Enviando para o cliente.`);

        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputPath)}"`);
        res.setHeader('Content-Type', 'application/pdf');
        
        const fileStream = fs.createReadStream(outputPath);
        fileStream.pipe(res);
        
        // Limpar o arquivo temporário após o envio
        fileStream.on('close', () => {
            fs.unlink(outputPath, (err) => {
                if (err) console.error(`[PDF EXPORT] Erro ao limpar arquivo temporário ${outputPath}:`, err);
                else console.log(`[PDF EXPORT] Arquivo temporário ${outputPath} limpo.`);
            });
        });
        fileStream.on('error', (err) => {
             console.error(`[PDF EXPORT] Erro no stream do arquivo ${outputPath}:`, err);
             // Tentar limpar mesmo em caso de erro de stream
             fs.unlink(outputPath, (unlinkErr) => {
                 if (unlinkErr) console.error(`[PDF EXPORT] Erro ao limpar arquivo temporário ${outputPath} após erro de stream:`, unlinkErr);
             });
             if (!res.headersSent) {
                 res.status(500).json({ message: "Erro ao enviar o arquivo PDF." });
             }
        });

    } catch (error) {
        console.error("[PDF EXPORT] Erro geral ao exportar PDF:", error);
        // Garantir que a resposta não seja enviada duas vezes
        if (!res.headersSent) {
             res.status(500).json({ message: "Erro interno do servidor ao gerar PDF.", error: error.message });
        }
    }
};

// --- Endpoint para buscar eventos para dropdown ---
const getEventosForDropdown = async (req, res) => {
    try {
        // Selecionar apenas ID e nome, talvez data para diferenciar
        const [eventos] = await pool.query(
            "SELECT id, nome_gravacao, data_evento FROM EventosCalendario ORDER BY data_evento DESC, nome_gravacao ASC"
        );
        // Formatar para o dropdown (ex: "Nome da Gravação (DD/MM/YYYY)")
        const formattedEventos = eventos.map(e => ({
            id: e.id,
            nome: `${e.nome_gravacao} (${new Date(e.data_evento).toLocaleDateString("pt-BR")})`
        }));
        res.json(formattedEventos);
    } catch (error) {
        console.error("Erro ao buscar eventos para dropdown:", error);
        res.status(500).json({ message: "Erro interno do servidor.", error: error.message });
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
    exportRoteiroToPdf,
    getEventosForDropdown // Exportar a nova função
};

