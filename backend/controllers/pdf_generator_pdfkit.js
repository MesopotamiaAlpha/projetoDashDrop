const PDFDocument = require('pdfkit');

// Função para gerar PDF usando PDFKit
function generatePDF(roteiro) {
    return new Promise((resolve, reject) => {
        try {
            // Criar um buffer para armazenar o PDF
            const chunks = [];
            
            // Criar um novo documento PDF
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Roteiro: ${roteiro.nome}`,
                    Author: 'Produtora Audiovisual Platform'
                }
            });
            
            // Pipe o PDF para o buffer
            doc.on('data', chunks.push.bind(chunks));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(pdfBuffer);
            });
            
            // Título do roteiro
            doc.fontSize(18).font('Helvetica-Bold').text(`Roteiro: ${roteiro.nome}`, {align: 'center'});
            doc.moveDown();
            
            // Informações do roteiro
            doc.fontSize(12).font('Helvetica');
            doc.text(`Data de Criação: ${roteiro.data_criacao_documento ? new Date(roteiro.data_criacao_documento).toLocaleDateString("pt-BR") : 'N/A'}`);
            doc.text(`Tipo: ${roteiro.tipo_roteiro || 'N/A'}`);
            doc.text(`Ano: ${roteiro.ano}`);
            doc.text(`Mês: ${new Date(0, roteiro.mes - 1).toLocaleString('pt-BR', { month: 'long' })}`);
            doc.moveDown();
            
            // Definir colunas padrão caso não existam
            const colunasVisiveis = roteiro.colunasVisiveis || [
                { id: 'video', nome: 'VÍDEO' },
                { id: 'tec_transicao', nome: 'TEC / TRANSIÇÃO' },
                { id: 'audio', nome: 'ÁUDIO' }
            ];
            
            // Calcular larguras das colunas
            const pageWidth = doc.page.width - 100; // Largura útil da página
            const colWidths = {};
            
            // Distribuir largura disponível entre as colunas
            colunasVisiveis.forEach((col, index) => {
                if (index === 0) {
                    colWidths[col.id] = Math.floor(pageWidth * 0.35); // Primeira coluna (VÍDEO) - 35%
                } else if (index === 1) {
                    colWidths[col.id] = Math.floor(pageWidth * 0.25); // Segunda coluna (TEC) - 25%
                } else {
                    colWidths[col.id] = Math.floor(pageWidth * 0.4); // Terceira coluna (ÁUDIO) - 40%
                }
            });
            
            // Posição inicial da tabela
            let y = doc.y;
            
            // Desenhar cabeçalho da tabela
            doc.font('Helvetica-Bold').fontSize(10);
            doc.rect(50, y, pageWidth, 20).fill('#e0e0e0');
            
            let x = 50;
            colunasVisiveis.forEach(col => {
                doc.fillColor('black').text(col.nome, x + 5, y + 5, {
                    width: colWidths[col.id],
                    align: 'left'
                });
                x += colWidths[col.id];
            });
            
            y += 20;
            
            // Verificar se roteiro.pautas existe e é um array
            const pautas = Array.isArray(roteiro.pautas) ? roteiro.pautas : [];
            
            // Desenhar linhas da tabela
            doc.font('Helvetica').fontSize(9);
            
            pautas.forEach(pauta => {
                // Verificar se precisamos adicionar uma nova página
                if (y > doc.page.height - 100) {
                    doc.addPage();
                    y = 50;
                }
                
                if (pauta.tipo_linha === 'divisoria') {
                    // Linha divisória (cabeçalho de cena)
                    const nomeDivisao = pauta.nome_divisao || pauta.video || 'NOVA CENA';
                    
                    doc.rect(50, y, pageWidth, 15).fill('#f0f0f0');
                    doc.fillColor('black').font('Helvetica-Bold').fontSize(10)
                       .text(nomeDivisao, 50, y + 3, {
                           width: pageWidth,
                           align: 'center'
                       });
                    
                    y += 15;
                    doc.font('Helvetica').fontSize(9);
                } else {
                    // Linha normal de pauta
                    // Calcular altura necessária para cada célula
                    let maxHeight = 20; // Altura mínima
                    
                    // Desenhar células
                    x = 50;
                    colunasVisiveis.forEach(col => {
                        let cellValue = '';
                        
                        // Verificar se o valor existe no objeto pauta
                        if (col.id in pauta) {
                            cellValue = pauta[col.id] || '';
                        } 
                        // Verificar se o valor existe em colunas_personalizadas_json
                        else if (pauta.colunas_personalizadas_json && col.id in pauta.colunas_personalizadas_json) {
                            cellValue = pauta.colunas_personalizadas_json[col.id] || '';
                        }
                        
                        // Desenhar borda da célula
                        doc.rect(x, y, colWidths[col.id], maxHeight).stroke();
                        
                        // Escrever conteúdo da célula
                        doc.text(String(cellValue), x + 5, y + 5, {
                            width: colWidths[col.id] - 10,
                            height: maxHeight - 10,
                            ellipsis: true
                        });
                        
                        x += colWidths[col.id];
                    });
                    
                    y += maxHeight;
                }
            });
            
            // Finalizar o documento
            doc.end();
            
        } catch (error) {
            console.error('Erro ao gerar PDF com PDFKit:', error);
            reject(error);
        }
    });
}

module.exports = { generatePDF };
