-- Adiciona a coluna cor à tabela EventosCalendario
ALTER TABLE EventosCalendario
ADD COLUMN cor VARCHAR(20) DEFAULT NULL;
