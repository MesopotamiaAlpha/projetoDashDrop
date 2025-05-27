-- Script de migração para adicionar a tabela de junção CenaTags

-- Tabela de Junção Cena-Tags
CREATE TABLE CenaTags (
    cena_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (cena_id, tag_id),
    FOREIGN KEY (cena_id) REFERENCES CenasRoteiro(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tags(id) ON DELETE CASCADE
);

-- Opcional: Adicionar um índice para otimizar buscas por tag_id
-- CREATE INDEX idx_cenatags_tag_id ON CenaTags(tag_id);

-- Consideração: A lógica para gerar cores únicas automaticamente será implementada no backend
-- ao criar uma nova tag se nenhuma cor for fornecida.

