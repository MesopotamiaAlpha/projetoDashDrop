-- Adiciona a coluna modo_noturno à tabela Usuarios
ALTER TABLE Usuarios
ADD COLUMN modo_noturno BOOLEAN DEFAULT FALSE;
