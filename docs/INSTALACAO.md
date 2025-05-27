# Guia de Instalação e Atualização - Plataforma de Produtora Audiovisual

Este guia fornece instruções detalhadas para instalar e configurar a Plataforma de Produtora Audiovisual.

## Requisitos do Sistema

- Node.js (v14 ou superior)
- MySQL (v5.7 ou superior)
- Python 3.11 (para geração de PDF)

## Instalação

### 1. Configuração do Banco de Dados

1. Crie um banco de dados MySQL:
   ```sql
   CREATE DATABASE produtora_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Execute o script de criação de tabelas:
   ```bash
   mysql -u seu_usuario -p produtora_db < schema.sql
   ```

3. **IMPORTANTE**: Execute os scripts de migração na seguinte ordem:
   ```bash
   mysql -u seu_usuario -p produtora_db < migration_add_tipo_roteiro.sql
   mysql -u seu_usuario -p produtora_db < migration_add_cenasroteiro_columns.sql
   mysql -u seu_usuario -p produtora_db < migration_add_evento_id_to_roteiros.sql
   mysql -u seu_usuario -p produtora_db < migration_add_cena_tags.sql
   ```

### 2. Configuração do Backend

1. Navegue até a pasta do backend:
   ```bash
   cd backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie um arquivo `.env` na pasta backend com as seguintes configurações:
   ```
   DB_HOST=localhost
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_DATABASE=produtora_db
   JWT_SECRET=sua_chave_secreta_para_tokens
   PORT=3001
   ```

4. Inicie o servidor:
   ```bash
   npm start
   ```

### 3. Configuração do Frontend

1. Navegue até a pasta do frontend:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie um arquivo `.env` na pasta frontend com as seguintes configurações:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```

## Atualização de Versão Anterior

Se você já tem uma versão anterior instalada, siga estes passos para atualizar:

1. Faça backup do seu banco de dados:
   ```bash
   mysqldump -u seu_usuario -p produtora_db > backup_produtora_db.sql
   ```

2. Execute os scripts de migração que ainda não foram aplicados:
   ```bash
   mysql -u seu_usuario -p produtora_db < migration_add_tipo_roteiro.sql
   mysql -u seu_usuario -p produtora_db < migration_add_evento_id_to_roteiros.sql
   mysql -u seu_usuario -p produtora_db < migration_add_cena_tags.sql
   ```

3. Substitua os arquivos do backend e frontend pelos novos arquivos.

4. Reinstale as dependências em ambos os diretórios:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

5. Reinicie os servidores.

## Solução de Problemas

### Erro: "Unknown column 'tipo_roteiro' in 'field list'"

Este erro ocorre quando a coluna `tipo_roteiro` não foi adicionada à tabela `Roteiros`. Execute o script de migração:

```bash
mysql -u seu_usuario -p produtora_db < migration_add_tipo_roteiro.sql
```

### Erro: "Table 'produtora_db.eventos' doesn't exist"

Este erro ocorre porque o sistema está procurando pela tabela `Eventos`, mas o nome correto é `EventosCalendario`. Verifique se o script `schema.sql` foi executado corretamente para criar a tabela `EventosCalendario`.

Se a tabela não existir, execute:

```sql
CREATE TABLE EventosCalendario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_gravacao VARCHAR(255) NOT NULL,
    data_evento DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME,
    tema VARCHAR(255),
    usuario_id INT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    criado_por_id INT,
    atualizado_por_id INT,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (criado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (atualizado_por_id) REFERENCES Usuarios(id) ON DELETE SET NULL
);
```

### Erro: "Cannot find module"

Este erro ocorre quando uma dependência não foi instalada. Execute `npm install` na pasta correspondente (backend ou frontend).

## Contato para Suporte

Se você encontrar problemas durante a instalação ou uso da plataforma, entre em contato com o suporte técnico.
