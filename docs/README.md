# Documentação da Plataforma de Produtora Audiovisual

## Visão Geral

Esta plataforma foi desenvolvida para auxiliar produtoras audiovisuais no gerenciamento de roteiros (espelhos de gravação), agendamentos no calendário, controle de equipamentos e criação de checklists para gravações. O sistema é composto por um backend em Node.js com Express.js, um banco de dados MySQL e um frontend em React.

## Funcionalidades Principais

### Gerenciamento de Roteiros
- Criação, edição e visualização de roteiros
- Campo para tipo de roteiro (PROGRAMA AO VIVO, GRAVADO, PODCAST, etc.)
- Vinculação com eventos do calendário
- Sistema de tags para categorização
- Tags por linha na coluna de localização
- Geração de PDF e impressão direta
- Divisão de cenas com linhas separadoras
- Colunas personalizáveis e redimensionáveis
- Estilização de linhas com cores de fundo

### Calendário de Gravações
- Agendamento de eventos com data, horário e tema
- Associação de apresentadores aos eventos
- Vinculação bidirecional com roteiros
- Filtros por mês, ano, apresentador e tema

### Sistema de Tags
- Criação de tags com cores automáticas
- Aplicação de tags em roteiros para categorização
- Tags por linha na coluna de localização
- Visualização colorida das tags

### Equipamentos e Checklists
- Cadastro e controle de equipamentos
- Criação de checklists para gravações
- Vinculação de checklists com eventos

## Requisitos Técnicos

- Node.js (versão 14.x ou superior)
- MySQL (versão 5.7 ou superior)
- Navegador moderno (Chrome, Firefox, Edge)
- PDFKit para geração de PDF

## Instalação e Configuração

Consulte o arquivo INSTALACAO.md para instruções detalhadas sobre como instalar e configurar o sistema.

## Estrutura do Banco de Dados

O banco de dados é composto pelas seguintes tabelas principais:

- **Usuarios**: Armazena informações dos usuários do sistema
- **Roteiros**: Contém os roteiros de gravação
- **CenasRoteiro**: Armazena as linhas de cada roteiro
- **Tags**: Contém as tags para categorização
- **RoteiroTags**: Associação entre roteiros e tags
- **CenaTags**: Associação entre linhas de roteiro e tags (tags por linha)
- **EventosCalendario**: Eventos agendados no calendário
- **EventoApresentadores**: Associação entre eventos e apresentadores
- **Equipamentos**: Cadastro de equipamentos
- **ChecklistsGravacao**: Checklists para gravações
- **ChecklistItens**: Itens de cada checklist

## Atualizações Recentes

### Tipo de Roteiro
- Campo adicionado para especificar o tipo de roteiro
- Exibido na listagem e no PDF gerado

### Vinculação com Gravações
- Roteiros podem ser vinculados a eventos do calendário
- Visualização bidirecional entre roteiros e eventos

### Tags por Linha
- Tags podem ser aplicadas a linhas específicas na coluna de localização
- Visualização colorida das tags
- Legendas no PDF gerado

## Suporte e Contato

Para suporte técnico ou dúvidas sobre o sistema, entre em contato com a equipe de desenvolvimento.
