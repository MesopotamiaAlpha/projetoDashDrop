-- Script de migração para adicionar as colunas localizacao e tipo_linha à tabela CenasRoteiro

-- Adicionar a coluna localizacao à tabela CenasRoteiro
ALTER TABLE CenasRoteiro ADD COLUMN localizacao VARCHAR(255) NULL AFTER colunas_personalizadas_json;

-- Adicionar a coluna tipo_linha à tabela CenasRoteiro
ALTER TABLE CenasRoteiro ADD COLUMN tipo_linha VARCHAR(50) DEFAULT 'pauta' AFTER localizacao;
