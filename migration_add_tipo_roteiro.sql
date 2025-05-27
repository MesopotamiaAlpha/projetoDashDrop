-- Script de migração para adicionar a coluna tipo_roteiro à tabela Roteiros

-- Adicionar a coluna tipo_roteiro à tabela Roteiros
ALTER TABLE Roteiros ADD COLUMN tipo_roteiro VARCHAR(100) NULL AFTER data_criacao_documento;

-- Atualizar registros existentes com um valor padrão (opcional)
-- UPDATE Roteiros SET tipo_roteiro = 'PADRÃO' WHERE tipo_roteiro IS NULL;
