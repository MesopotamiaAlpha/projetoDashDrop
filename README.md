---
---

# Plataforma de Gerenciamento para Produtora Audiovisual

## Visão Geral do Projeto

Esta plataforma foi desenvolvida para auxiliar produtoras audiovisuais no gerenciamento de roteiros (espelhos de gravação), agendamentos no calendário, controle de equipamentos e criação de checklists para gravações. O sistema é composto por um backend em Node.js com Express.js, um banco de dados MySQL e um frontend em React.

## Tecnologias Utilizadas

*   **Backend**: Node.js, Express.js, MySQL2, JWT (JSON Web Tokens), Bcrypt, WeasyPrint (via Python)
*   **Frontend**: React, React Router, Axios, Tailwind CSS
*   **Banco de Dados**: MySQL
*   **Controle de Versão**: Git

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em seu sistema:

*   Node.js (versão 14.x ou superior recomendada)
*   npm (geralmente vem com o Node.js) ou Yarn
*   MySQL Server (versão 5.7 ou superior recomendada)
*   Git (para clonar o repositório, se aplicável)
*   Python (versão 3.x recomendada, para a geração de PDF via WeasyPrint)
*   WeasyPrint (biblioteca Python, instalável via pip: `pip install WeasyPrint`)

## Estrutura do Projeto

O projeto está organizado da seguinte forma:

```
/produtora_audiovisual_platform
|-- /backend         # Código-fonte do servidor Node.js
|   |-- /config      # Configurações (ex: banco de dados)
|   |-- /controllers # Lógica de controle para as rotas
|   |-- /middleware  # Middlewares (ex: autenticação)
|   |-- /routes      # Definições das rotas da API
|   |-- generate_pdf.py # Script Python para gerar PDF com WeasyPrint
|   |-- .env         # Variáveis de ambiente (NÃO versionar)
|   |-- package.json
|   |-- server.js    # Ponto de entrada do backend
|-- /frontend        # Código-fonte da aplicação React
|   |-- /public
|   |-- /src
|   |   |-- /assets
|   |   |-- /components
|   |   |-- /contexts
|   |   |-- /hooks
|   |   |-- /pages
|   |   |-- /services
|   |   |-- /utils
|   |   |-- App.js
|   |   |-- index.js
|   |   |-- index.css
|   |-- .env         # Variáveis de ambiente do frontend (opcional)
|   |-- package.json
|   |-- tailwind.config.js
|   |-- postcss.config.js
|-- schema.sql       # Script SQL para criação do banco de dados
|-- todo.md          # Checklist de desenvolvimento (referência interna)
|-- README.md        # Este arquivo
```

## Configuração e Instalação

Siga os passos abaixo para configurar e executar a aplicação localmente.

### 1. Banco de Dados (MySQL)

1.  **Inicie o MySQL Server** na sua máquina.
2.  **Crie um banco de dados** para a aplicação. O nome padrão esperado no backend é `produtora_db`. Você pode usar um cliente MySQL (como MySQL Workbench, DBeaver, ou o terminal MySQL) para executar:
    ```sql
    CREATE DATABASE produtora_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ```
3.  **Execute o script `schema.sql`** para criar todas as tabelas necessárias. Este arquivo está na raiz do projeto (`/produtora_audiovisual_platform/schema.sql`). Importe e execute este script no banco de dados `produtora_db` que você acabou de criar.
4.  **Crie o Usuário Administrador Inicial (Manual)**: O script `schema.sql` **não** cria um usuário administrador automaticamente. Você precisa inseri-lo manualmente. Execute o seguinte comando SQL no seu banco de dados `produtora_db` para criar um usuário `admin` com a senha `admin123`:
    ```sql
    INSERT INTO Usuarios (nome_usuario, senha_hash, nome_completo, email, perfil_apresentador) VALUES (
        'admin',
        '$2b$10$KuOhTWlold.orby5eGP6ieR0vxmyzYiQtlosTqlfX88sAdls3SFfW', -- Hash para a senha 'admin123'
        'Administrador do Sistema',
        'admin@produtora.com',
        FALSE
    );
    ```
    *   **Credenciais para login após este passo:**
        *   Nome de usuário: `admin`
        *   Senha: `admin123`
    *   **É altamente recomendável alterar esta senha após o primeiro login através da página de Configurações da aplicação.**

### 2. Backend (Node.js)

1.  **Navegue até o diretório do backend**:
    ```bash
    cd produtora_audiovisual_platform/backend
    ```
2.  **Instale as dependências Node.js**:
    ```bash
    npm install
    ```
3.  **Instale as dependências Python (WeasyPrint)**:
    Certifique-se de ter o Python e o pip instalados. Então, execute:
    ```bash
    pip install WeasyPrint
    ```
4.  **Configure as variáveis de ambiente**: Crie um arquivo `.env` na raiz do diretório `backend` (`produtora_audiovisual_platform/backend/.env`) e adicione as seguintes variáveis, ajustando conforme necessário:
    ```env
    DB_HOST=localhost
    DB_USER=seu_usuario_mysql # Ex: root
    DB_PASSWORD=sua_senha_mysql # Ex: password
    DB_NAME=produtora_db
    JWT_SECRET=sua_chave_secreta_super_segura_para_jwt # Mude para uma chave forte e aleatória
    PORT=3001
    ```
    *   Substitua `seu_usuario_mysql` e `sua_senha_mysql` pelas suas credenciais do MySQL.
    *   `JWT_SECRET` é crucial para a segurança da autenticação. Use uma string longa e aleatória.
5.  **Inicie o servidor backend**:
    ```bash
    npm start
    ```
    Ou, para desenvolvimento com reinício automático (se tiver `nodemon` instalado globalmente ou como dependência de desenvolvimento):
    ```bash
    nodemon server.js
    ```
    O servidor backend estará rodando em `http://localhost:3001` (ou na porta definida em `PORT`).

### 3. Frontend (React)

1.  **Abra um novo terminal** (mantenha o backend rodando).
2.  **Navegue até o diretório do frontend**:
    ```bash
    cd produtora_audiovisual_platform/frontend
    ```
3.  **Instale as dependências**:
    ```bash
    npm install
    ```
4.  **(Opcional) Variáveis de Ambiente do Frontend**: O frontend tentará se conectar à API em `http://localhost:3001/api` por padrão. Se o seu backend estiver rodando em uma URL ou porta diferente, você pode criar um arquivo `.env` na raiz do diretório `frontend` (`produtora_audiovisual_platform/frontend/.env`) e definir:
    ```env
    REACT_APP_API_URL=http://seu_backend_url:porta/api
    ```
5.  **Inicie a aplicação React**:
    ```bash
    npm start
    ```
    A aplicação frontend será aberta automaticamente no seu navegador padrão, geralmente em `http://localhost:3000`.

## Acessando a Aplicação

Após iniciar o backend e o frontend:

1.  Abra seu navegador e acesse `http://localhost:3000` (ou a porta que o React iniciou).
2.  Você será direcionado para a página de login.
3.  Use as credenciais do usuário administrador padrão (`admin` / `admin123`) ou qualquer outro usuário que você criar através da plataforma.

## Funcionalidades Principais

*   **Autenticação de Usuários**: Login seguro com JWT.
*   **Dashboard**: Visão geral e acesso rápido aos módulos.
*   **Gerenciamento de Usuários**: Interface para listar, cadastrar, editar, alterar senha e excluir usuários.
*   **Gerenciamento de Roteiros (Espelhos de Gravação)**:
    *   Criação, edição, listagem e organização de roteiros.
    *   **Campo "Tipo de Roteiro"**: Adicionado um campo para especificar o tipo de roteiro (ex: PROGRAMA AO VIVO, GRAVADO, PODCAST) na criação/edição e exibido na listagem.
    *   **Filtro de Ano Estendido**: O filtro de ano na busca de roteiros agora abrange de 2025 até 2035.
    *   **Página de Edição de Roteiro Aprimorada**:
        *   **Botão "Adicionar Divisão de Cena"**: Permite adicionar uma linha divisória horizontal para separar cenas, com nome personalizável (inicialmente "NOVA CENA").
        *   **Botão "Adicionar Nova Linha de Pauta"**: Botão existente renomeado para clareza.
        *   **Redimensionamento de Colunas**: As colunas da tabela de pautas (Vídeo, Tec/Transição, Áudio, Colunas Personalizadas) podem ser redimensionadas horizontalmente arrastando suas bordas.
        *   **Coluna "Localização"**: Uma nova coluna "LOCALIZAÇÃO" foi adicionada. Permite inserir texto livre para o local da gravação (pensado para São José dos Campos, SP, mas aceita qualquer texto). **Esta coluna NÃO aparece na impressão ou no PDF gerado.**
        *   **Botão "Remover Linha/Divisão"**: Movido para uma coluna de "Ações" dedicada ao final de cada linha da pauta ou divisão, para melhor organização.
        *   **Colunas Personalizadas**: Continua sendo possível adicionar e remover colunas personalizadas dinamicamente para cada linha de pauta.
        *   **Estilização de Linha**: Opção para escolher cor de fundo da linha.
    *   **Geração de PDF do Roteiro**: Um botão "Gerar PDF" na página de edição de roteiro permite exportar o roteiro atual para um arquivo PDF. O PDF inclui o logo da empresa (se configurado), nome do roteiro, tipo, data do documento e a tabela de pautas (excluindo a coluna "Localização" e a coluna de "Ações").
    *   **Impressão Direta do Roteiro**: Um botão "Imprimir" na página de edição de roteiro aciona a funcionalidade de impressão do navegador, formatando a página para uma impressão limpa do roteiro (ocultando elementos de interface e a coluna "Localização").
*   **Gerenciamento de Tags**: Crie e gerencie tags coloridas para organizar roteiros.
*   **Calendário de Gravações**: Agendamento de eventos e filtros.
*   **Gerenciamento de Equipamentos**: Cadastro e controle de equipamentos.
*   **Checklists de Equipamentos**: Criação de checklists personalizados.
*   **Configurações de Usuário**: Atualização de perfil e senha. Upload de logo da empresa.

## Notas Adicionais e Solução de Problemas

*   **Geração de PDF com WeasyPrint**: A geração de PDF para roteiros utiliza a biblioteca WeasyPrint em Python. O backend Node.js chama um script Python (`generate_pdf.py`) que recebe os dados do roteiro, gera um HTML e o converte para PDF. Certifique-se de que Python e WeasyPrint estão instalados e acessíveis no PATH do sistema para que o backend possa executar o script.
*   **Impressão Direta**: A funcionalidade de impressão direta usa `window.print()` e CSS específico para impressão (`@media print`) para formatar o conteúdo. A qualidade e o layout final podem variar ligeiramente entre navegadores.
*   **Upload de Logo**: A página de configurações permite selecionar um arquivo de logo. O backend atual (`userController.js`) espera um `logo_empresa_path` como string. Para um upload de arquivo funcional, o backend precisaria de um endpoint específico para lidar com `multipart/form-data` (ex: usando `multer` em Express) para receber o arquivo, salvá-lo no servidor (ou em um serviço de storage) e então salvar o caminho/URL no banco de dados. A implementação atual é um placeholder para essa funcionalidade.
*   **Segurança**: Lembre-se de usar senhas fortes para o banco de dados e para o `JWT_SECRET` em um ambiente de produção.
*   **Backup**: Faça backups regulares do seu banco de dados.

## Contribuições e Melhorias Futuras

Este projeto pode ser expandido com diversas funcionalidades, como:

*   Sistema de permissões mais granular para usuários.
*   Notificações (ex: para eventos do calendário).
*   Funcionalidade de registro de novos usuários diretamente pela interface.
*   Melhorias na interface do usuário e experiência do usuário (UX).
*   Testes automatizados mais abrangentes.
*   Deployment para um ambiente de produção.

---

