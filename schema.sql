-- Scripts SQL para criação do banco de dados da Plataforma de Produtora Audiovisual

create database produtora_db;
use produtora_db;
-- Tabela de Usuários
CREATE TABLE Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_usuario VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    nome_completo VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    perfil_apresentador BOOLEAN DEFAULT FALSE,
    logo_empresa_path VARCHAR(255) NULL, -- Caminho para o logo da empresa, se este usuário for o "admin" ou tiver essa config
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Logs de Auditoria
CREATE TABLE LogsAuditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tabela_afetada VARCHAR(255) NOT NULL,
    registro_afetado_id INT NOT NULL,
    acao_realizada VARCHAR(50) NOT NULL, -- EX: CRIACAO, ATUALIZACAO, DELECAO
    detalhes_alteracao TEXT, -- JSON ou texto descrevendo o que mudou
    usuario_id INT,
    realizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela de Tags
CREATE TABLE Tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    cor VARCHAR(7) DEFAULT '#FFFFFF', -- Cor em hexadecimal
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por_id INT,
    atualizado_por_id INT,
    FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela de Roteiros
CREATE TABLE Roteiros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    ano INT NOT NULL,
    mes INT NOT NULL,
    conteudo_principal TEXT, -- Pode ser usado para uma descrição geral ou metadados
    data_criacao_documento DATE,
    usuario_id INT, -- Quem criou/possui o roteiro
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por_id INT,
    atualizado_por_id INT,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    INDEX idx_roteiros_ano_mes (ano, mes)
);

-- Tabela de Junção Roteiro-Tags
CREATE TABLE RoteiroTags (
    roteiro_id INT,
    tag_id INT,
    PRIMARY KEY (roteiro_id, tag_id),
    FOREIGN KEY (roteiro_id) REFERENCES Roteiros(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tags(id) ON DELETE CASCADE
);

-- Tabela de Cenas do Roteiro
CREATE TABLE CenasRoteiro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roteiro_id INT NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    video TEXT,
    tec_transicao TEXT,
    audio TEXT,
    estilo_linha_json TEXT, -- JSON para { cor_fonte: '#RRGGBB', cor_fundo: '#RRGGBB', altura_personalizada: '100px' }
    colunas_personalizadas_json TEXT, -- JSON para { "Nome Coluna 1": "Conteúdo 1", "Nome Coluna 2": "Conteúdo 2" }
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por_id INT,
    atualizado_por_id INT,
    FOREIGN KEY (roteiro_id) REFERENCES Roteiros(id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela de Eventos do Calendário
CREATE TABLE EventosCalendario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_gravacao VARCHAR(255) NOT NULL,
    data_evento DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME,
    tema VARCHAR(255),
    usuario_id INT, -- Usuário que agendou
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por_id INT,
    atualizado_por_id INT,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela de Junção Evento-Apresentadores (um evento pode ter múltiplos apresentadores)
CREATE TABLE EventoApresentadores (
    evento_id INT,
    apresentador_id INT, -- ID do usuário com perfil_apresentador = TRUE
    PRIMARY KEY (evento_id, apresentador_id),
    FOREIGN KEY (evento_id) REFERENCES EventosCalendario(id) ON DELETE CASCADE,
    FOREIGN KEY (apresentador_id) REFERENCES Usuarios(id) ON DELETE CASCADE
);

-- Tabela de Equipamentos
CREATE TABLE Equipamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    numero_serie VARCHAR(255) UNIQUE,
    categoria VARCHAR(100),
    data_ultima_manutencao DATE,
    tipo_equipamento VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por_id INT,
    atualizado_por_id INT,
    FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela de Checklist de Equipamentos para Gravação (documento de checklist)
CREATE TABLE ChecklistsGravacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_gravacao_associada VARCHAR(255) NOT NULL, -- Pode referenciar um evento ou ser um nome livre
    evento_id INT NULL, -- Opcional, para vincular a um evento específico do calendário
    data_checklist DATE NOT NULL,
    usuario_id INT, -- Quem criou o checklist
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por_id INT,
    atualizado_por_id INT,
    FOREIGN KEY (evento_id) REFERENCES EventosCalendario(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);

-- Tabela de Itens do Checklist de Equipamentos (quais equipamentos foram selecionados para um checklist)
CREATE TABLE ChecklistItens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT NOT NULL,
    equipamento_id INT NOT NULL,
    quantidade_a_levar INT DEFAULT 1,
    -- Não vamos colocar "pegou" aqui, pois isso é para anotação no papel.
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (checklist_id) REFERENCES ChecklistsGravacao(id) ON DELETE CASCADE,
    FOREIGN KEY (equipamento_id) REFERENCES Equipamentos(id) ON DELETE CASCADE
);

-- Adicionar usuário admin inicial (exemplo, a senha deve ser hash na aplicação)
-- INSERT INTO Usuarios (nome_usuario, senha_hash, nome_completo, email, perfil_apresentador) VALUES ('admin', 'hash_da_senha_admin', 'Administrador do Sistema', 'admin@produtora.com', FALSE);

--Adicionar o usuario admin para iniciar o banco, acima é um exemplo
--INSERT INTO Usuarios (nome_usuario, senha_hash, nome_completo, email, perfil_apresentador) VALUES ('admin', '$2b$10$KuOhTWlold.orby5eGP6ieR0vxmyzYiQtlosTqlfX88sAdls3SFfW', 'Administrador do Sistema', 'admin@produtora.com', FALSE);

-- Adicionar campos de auditoria às tabelas que ainda não os possuem de forma explícita para criado_por/atualizado_por
-- (Já incluído na maioria das tabelas acima)

-- Considerações:
-- 1. Auditoria: A tabela LogsAuditoria é genérica. Triggers no banco ou lógica na API podem populá-la.
--    Alternativamente, as colunas criado_por_id e atualizado_por_id nas próprias tabelas já oferecem um nível de auditoria.
-- 2. Colunas Personalizadas em CenasRoteiro: Armazenar como JSON é flexível. A lógica de apresentação e edição será no frontend/backend.
-- 3. Logo da Empresa: Adicionado um campo `logo_empresa_path` na tabela `Usuarios`. Pode ser que apenas um usuário (admin) configure isso, ou cada um tenha o seu.
--    Se for um logo global, uma tabela `ConfiguracoesGlobais` seria melhor.
--    Para este escopo, assumi que pode ser por usuário ou um usuário específico (ex: o primeiro usuário criado, ou um com flag 'admin').
--    A lógica de qual logo usar no roteiro (se do criador do roteiro, ou um global) será definida na aplicação.
--    Para simplificar, o roteiro usará o logo do usuário que o criou, se este tiver um logo configurado.


