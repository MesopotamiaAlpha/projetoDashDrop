-- Script de migração para adicionar a coluna evento_id à tabela Roteiros

-- Adicionar a coluna evento_id à tabela Roteiros
ALTER TABLE Roteiros ADD COLUMN evento_id INT NULL AFTER tipo_roteiro;

-- Adicionar a chave estrangeira para a tabela EventosCalendario
ALTER TABLE Roteiros ADD CONSTRAINT fk_roteiro_evento FOREIGN KEY (evento_id) REFERENCES EventosCalendario(id) ON DELETE SET NULL;

-- Adicionar um índice para melhorar a performance de consultas
ALTER TABLE Roteiros ADD INDEX idx_roteiros_evento_id (evento_id);
