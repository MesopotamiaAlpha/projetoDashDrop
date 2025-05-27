-- Adiciona as colunas criado_por_id e atualizado_por_id na tabela Usuarios
ALTER TABLE Usuarios
ADD COLUMN criado_por_id INT NULL,
ADD COLUMN atualizado_por_id INT NULL,
ADD FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
ADD FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL;
