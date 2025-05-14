---
---

# Plataforma de Gerenciamento para Produtora Audiovisual

## Visão Geral do Projeto

Esta plataforma foi desenvolvida para auxiliar produtoras audiovisuais no gerenciamento de roteiros (espelhos de gravação), agendamentos no calendário, controle de equipamentos e criação de checklists para gravações. O sistema é composto por um backend em Node.js com Express.js, um banco de dados MySQL e um frontend em React.

## Tecnologias Utilizadas

*   **Backend**: Node.js, Express.js, MySQL2, JWT (JSON Web Tokens), Bcrypt
*   **Frontend**: React, React Router, Axios, Tailwind CSS, jsPDF
*   **Banco de Dados**: MySQL
*   **Controle de Versão**: Git

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em seu sistema:

*   Node.js (versão 14.x ou superior recomendada)
*   npm (geralmente vem com o Node.js) ou Yarn
*   MySQL Server (versão 5.7 ou superior recomendada)
*   Git (para clonar o repositório, se aplicável)

## Estrutura do Projeto

O projeto está organizado da seguinte forma:

```
/produtora_audiovisual_platform
|-- /backend         # Código-fonte do servidor Node.js
|   |-- /config      # Configurações (ex: banco de dados)
|   |-- /controllers # Lógica de controle para as rotas
|   |-- /middleware  # Middlewares (ex: autenticação)
|   |-- /models      # (Se usar ORM, não usado neste projeto diretamente nos arquivos)
|   |-- /routes      # Definições das rotas da API
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
2.  **Instale as dependências**:
    ```bash
    npm install
    ```
3.  **Configure as variáveis de ambiente**: Crie um arquivo `.env` na raiz do diretório `backend` (`produtora_audiovisual_platform/backend/.env`) e adicione as seguintes variáveis, ajustando conforme necessário:
    ```env
    DB_HOST=dropvideo.ddns.net
    DB_USER=seu_usuario_mysql # Ex: root
    DB_PASSWORD=sua_senha_mysql # Ex: password
    DB_NAME=produtora_db
    JWT_SECRET=sua_chave_secreta_super_segura_para_jwt # Mude para uma chave forte e aleatória
    PORT=3001
    ```
    *   Substitua `seu_usuario_mysql` e `sua_senha_mysql` pelas suas credenciais do MySQL.
    *   `JWT_SECRET` é crucial para a segurança da autenticação. Use uma string longa e aleatória.
4.  **Inicie o servidor backend**:
    ```bash
    npm start
    ```
    Ou, para desenvolvimento com reinício automático (se tiver `nodemon` instalado globalmente ou como dependência de desenvolvimento):
    ```bash
    nodemon server.js
    ```
    O servidor backend estará rodando em `http://dropvideo.ddns.net:3001` (ou na porta definida em `PORT`).

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
4.  **(Opcional) Variáveis de Ambiente do Frontend**: O frontend tentará se conectar à API em `http://dropvideo.ddns.net:3001/api` por padrão. Se o seu backend estiver rodando em uma URL ou porta diferente, você pode criar um arquivo `.env` na raiz do diretório `frontend` (`produtora_audiovisual_platform/frontend/.env`) e definir:
    ```env
    REACT_APP_API_URL=http://seu_backend_url:porta/api
    ```
5.  **Inicie a aplicação React**:
    ```bash
    npm start
    ```
    A aplicação frontend será aberta automaticamente no seu navegador padrão, geralmente em `http://dropvideo.ddns.net:3000`.

## Acessando a Aplicação

Após iniciar o backend e o frontend:

1.  Abra seu navegador e acesse `http://dropvideo.ddns.net:3000` (ou a porta que o React iniciou).
2.  Você será direcionado para a página de login.
3.  Use as credenciais do usuário administrador padrão (`admin` / `admin123`) ou qualquer outro usuário que você criar através da plataforma (funcionalidade de registro não implementada diretamente na tela de login, usuários são criados via `schema.sql` ou por um administrador no futuro).

## Funcionalidades Principais

*   **Autenticação de Usuários**: Login seguro com JWT.
*   **Dashboard**: Visão geral e acesso rápido aos módulos.
*   **Gerenciamento de Usuários (Nova Página)**: Interface para listar, cadastrar, editar (nome completo, email, perfil de apresentador), alterar senha e excluir usuários. Acessível pelo menu de navegação.
*   **Gerenciamento de Roteiros**: Criação, edição, listagem e organização de espelhos de gravação, com suporte a tags, formatação de cenas e colunas personalizadas.
*   **Gerenciamento de Tags**: Crie e gerencie tags coloridas para organizar roteiros.
*   **Calendário de Gravações**: Agendamento de eventos, associação de apresentadores (selecionados da lista de usuários com perfil de apresentador), e filtros.
*   **Gerenciamento de Equipamentos**: Cadastro e controle de equipamentos da produtora.
*   **Checklists de Equipamentos**: Criação de checklists personalizados para gravações, selecionando equipamentos do inventário.
*   **Configurações de Usuário**: Atualização de informações de perfil e alteração de senha. Upload de logo da empresa (a funcionalidade de upload do arquivo em si requer configuração adicional no backend para armazenamento persistente, atualmente salva o caminho).
*   **Geração de PDF**: Para roteiros e checklists de equipamentos (usando jsPDF no frontend).
*   **Impressão Direta**: Tentativa de impressão via `window.print()` para roteiros e checklists.

## Animações com PixiJS

A solicitação incluía o uso de PixiJS para animações. No estado atual do projeto, o foco principal foi na implementação das funcionalidades centrais e da estrutura da aplicação. A biblioteca PixiJS foi instalada no frontend (`npm install pixi.js`), mas as animações visuais específicas ainda não foram integradas extensivamente nas páginas.

**Sugestões para futuras implementações com PixiJS:**

*   Animações sutis em transições de página.
*   Efeitos visuais em interações com elementos da UI (ex: botões, cards).
*   Elementos gráficos interativos no Dashboard ou em módulos específicos.
*   Animações de carregamento (loading spinners) mais elaboradas.

O `App.js` e os componentes de página são os locais onde a lógica do PixiJS poderia ser inicializada e gerenciada para criar os efeitos desejados.

## Notas Adicionais e Solução de Problemas

*   **Tailwind CSS**: Durante a configuração inicial do Tailwind CSS no frontend, houve problemas com o comando `npx tailwindcss init -p`. Os arquivos `tailwind.config.js` e `postcss.config.js` foram criados e configurados manualmente para contornar isso. O Tailwind CSS está funcional.
*   **Upload de Logo**: A página de configurações permite selecionar um arquivo de logo. No entanto, o backend atual (`userController.js`) espera um `logo_empresa_path` como string. Para um upload de arquivo funcional, o backend precisaria de um endpoint específico para lidar com `multipart/form-data` (ex: usando `multer` em Express) para receber o arquivo, salvá-lo no servidor (ou em um serviço de storage) e então salvar o caminho/URL no banco de dados. A implementação atual é um placeholder para essa funcionalidade.
*   **Segurança**: Lembre-se de usar senhas fortes para o banco de dados e para o `JWT_SECRET` em um ambiente de produção.
*   **Backup**: Faça backups regulares do seu banco de dados.

## Contribuições e Melhorias Futuras

Este projeto pode ser expandido com diversas funcionalidades, como:

*   Sistema de permissões mais granular para usuários.
*   Notificações (ex: para eventos do calendário).
*   Funcionalidade de registro de novos usuários diretamente pela interface.
*   Melhorias na interface do usuário e experiência do usuário (UX).
*   Testes automatizados mais abrangentes.
*   Integração completa de animações com PixiJS.
*   Deployment para um ambiente de produção.

---

