const PDFDocument = require("pdfkit");
const fs = require("fs");

// Helper to calculate text width (approximated)
function getTextWidth(doc, text, fontSize) {
    doc.fontSize(fontSize);
    return doc.widthOfString(text);
}

// Helper to get contrasting text color (same as frontend)
const getContrastYIQ = (hexcolor) => {
    if (!hexcolor) return "#000000";
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split("").map(char => char + char).join("");
    }
    if (hexcolor.length !== 6) return "#000000"; // Invalid hex
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? "#000000" : "#FFFFFF";
};

async function generatePdf(data, outputPath) {
    return new Promise((resolve, reject) => {
        // Filtrar a coluna de Ações se existir
        const filteredColumns = data.colunas.filter(col => col.id !== 'acoes' && col.field !== 'acoes');
        data.colunas = filteredColumns;
        
        const doc = new PDFDocument({ 
            size: "A4", 
            layout: "landscape", 
            margin: 30 
        });
        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        let y = doc.y;
        const rowHeight = 20; // Base row height
        const headerHeight = 30;
        const footerHeight = 50; // Space for footer and legend
        const tableTop = doc.y + (data.logo_empresa_url ? 50 : 10); // Adjust table top based on logo
        const contentHeight = pageHeight - headerHeight - footerHeight;
        let currentPage = 1;
        const totalPages = 1; // We will update this later

        // --- Header --- 
        if (data.logo_empresa_url) {
            try {
                doc.image(data.logo_empresa_url, doc.page.margins.left, doc.page.margins.top, { height: 40 });
            } catch (imgErr) {
                console.warn("[PDF Generator] Error embedding logo:", imgErr.message);
            }
        }
        
        // Título centralizado
        doc.fontSize(18).font("Helvetica-Bold").text(data.nome || "Roteiro", doc.page.margins.left, doc.page.margins.top, { align: "center" });
        
        // Subtítulo com nome da gravação, se existir
        if (data.evento_nome) {
            doc.moveDown(0.5);
            doc.fontSize(12).font("Helvetica").text(`Gravação: ${data.evento_nome}`, { align: "center" });
        }
        
        // Informações do roteiro
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica").text(`Tipo: ${data.tipo_roteiro || "N/A"} | Ano: ${data.ano || "N/A"} | Mês: ${data.mes || "N/A"} | Data: ${data.data_criacao_documento ? new Date(data.data_criacao_documento).toLocaleDateString("pt-BR") : "N/A"}`, { align: "center" });
        doc.moveDown(2);
        y = tableTop;

        // --- Table Header --- 
        const drawTableHeader = () => {
            doc.font("Helvetica-Bold").fontSize(8);
            let x = doc.page.margins.left;
            
            // Cabeçalho com fundo branco
            doc.rect(x, y, pageWidth, headerHeight).fill("#FFFFFF").stroke("#DDDDDD");
            doc.fillColor("#000000");
            
            data.colunas.forEach(col => {
                doc.text(col.header, x + 5, y + 10, { width: col.width - 10, align: "center" });
                x += col.width;
            });
            y += headerHeight;
        };

        drawTableHeader();

        // --- Table Rows --- 
        doc.font("Helvetica").fontSize(9);
        data.cenas.forEach((cena, index) => {
            let x = doc.page.margins.left;
            const startY = y;
            let maxHeight = rowHeight; // Start with default height

            // Calculate max height needed for this row based on content
            data.colunas.forEach(col => {
                let cellContent = "";
                if (col.field === "tags") {
                    cellContent = cena.tags?.map(t => t.nome).join(", ") || "";
                } else {
                    cellContent = cena[col.field] || "";
                }
                const textHeight = doc.heightOfString(cellContent, { width: col.width - 10 });
                maxHeight = Math.max(maxHeight, textHeight + 10); // Add padding
            });
            
            // Check for page break BEFORE drawing the row
            if (y + maxHeight > doc.page.height - doc.page.margins.bottom - footerHeight) {
                // --- Draw Footer on current page before adding new one ---
                drawFooter(currentPage); // We need total pages here, placeholder for now
                doc.addPage({ layout: "landscape", margin: 30 });
                currentPage++;
                y = doc.page.margins.top;
                drawTableHeader(); // Redraw header on new page
            }

            // Definir cor de fundo para divisões de cena (cinza claro)
            if (cena.type === "divisoria") {
                doc.rect(x, y, pageWidth, maxHeight).fill("#F2F2F2").stroke("#EEEEEE");
            } else {
                // Bordas sutis para células normais
                doc.rect(x, y, pageWidth, maxHeight).stroke("#EEEEEE");
            }

            // Draw cell content
            data.colunas.forEach(col => {
                doc.fillColor("#000000"); // Reset text color
                if (cena.type === "divisoria" && col.field === data.colunas[0].field) {
                    // Draw division row (spans all columns)
                    doc.font("Helvetica-Bold").fontSize(10);
                    doc.text(cena.nome_divisao || "NOVA CENA", x + 5, y + (maxHeight / 2) - 5, { 
                        width: pageWidth - 10, 
                        align: "center" 
                    });
                    // Skip other columns for divisoria
                } else if (cena.type !== "divisoria") {
                    doc.font("Helvetica").fontSize(9);
                    if (col.field === "tags") {
                        // Draw tags with colors
                        let tagX = x + 5;
                        const tagY = y + 5;
                        if (cena.tags && cena.tags.length > 0) {
                            cena.tags.forEach(tag => {
                                const tagText = tag.nome;
                                const tagColor = tag.cor || "#CCCCCC";
                                const textColor = getContrastYIQ(tagColor);
                                const tagWidth = getTextWidth(doc, tagText, 8) + 10; // Text width + padding
                                const tagHeight = 12;

                                if (tagX + tagWidth < x + col.width - 5) { // Check if tag fits
                                    doc.rect(tagX, tagY, tagWidth, tagHeight).fill(tagColor);
                                    doc.fillColor(textColor).fontSize(8).text(tagText, tagX + 5, tagY + 2, { width: tagWidth - 10 });
                                    tagX += tagWidth + 3; // Move to next tag position
                                }
                            });
                        }
                    } else {
                        // Draw regular text content
                        doc.text(cena[col.field] || "", x + 5, y + 5, { width: col.width - 10, align: "left" });
                    }
                }
                x += col.width;
            });
            y += maxHeight;
        });

        // --- Footer Function --- 
        const drawFooter = (pageNumber) => {
            const footerY = doc.page.height - doc.page.margins.bottom - footerHeight + 10;
            doc.fontSize(8).font("Helvetica");
            
            // Draw Legend
            if (data.tagsLegenda && data.tagsLegenda.length > 0) {
                let legendX = doc.page.margins.left;
                const legendY = footerY;
                doc.font("Helvetica-Bold").text("Legenda Tags:", legendX, legendY, { continued: true });
                doc.font("Helvetica");
                legendX += getTextWidth(doc, "Legenda Tags: ", 8);
                
                data.tagsLegenda.forEach(tag => {
                    const tagText = tag.nome;
                    const tagColor = tag.cor || "#CCCCCC";
                    const legendItemWidth = getTextWidth(doc, tagText, 8) + 15; // Color box + text + padding
                    
                    if (legendX + legendItemWidth < doc.page.width - doc.page.margins.right - 50) { // Check bounds
                        doc.rect(legendX, legendY + 1, 8, 8).fill(tagColor); // Color box
                        doc.fillColor("#000000").text(tagText, legendX + 12, legendY);
                        legendX += legendItemWidth + 10; // Space between items
                    } else {
                        // Handle legend wrapping if needed (simplified: just stop adding)
                    }
                });
            }

            // Draw Page Number (bottom right)
            const pageNumText = `Página ${pageNumber}`; // Placeholder, need total pages
            const pageNumWidth = getTextWidth(doc, pageNumText, 8);
            doc.fillColor("#555555").text(pageNumText, 
                doc.page.width - doc.page.margins.right - pageNumWidth, 
                doc.page.height - doc.page.margins.bottom - 10, // Position at very bottom
                { align: "right" }
            );
        };

        // Draw footer on the last page
        drawFooter(currentPage);

        // Finalize the PDF and end the stream
        doc.end();

        writeStream.on("finish", () => {
            console.log(`[PDF Generator] Successfully wrote PDF to ${outputPath}`);
            resolve(outputPath);
        });
        writeStream.on("error", (err) => {
            console.error(`[PDF Generator] Error writing PDF stream:`, err);
            reject(err);
        });

    });
}

module.exports = { generatePdf };
