# Imprimo3DLab — Sistema de Gestão

Sistema interno da empresa para orçamentos, pedidos, consignados, estoque, clientes e financeiro.

## Produção

- Site: https://forma3d-gestao.carlaveronica890379.chatgpt.site
- Código oficial: branch `main` do repositório GitHub configurado como `origin`.
- Acesso: autenticação com ChatGPT e autorização por lista de administradores configurada com segurança no ambiente do Sites.
- Fuso horário de negócio: `America/Fortaleza` (UTC−3).

## Banco de dados

Os dados da empresa ficam no banco D1 persistente ligado ao projeto do Sites pelo binding `DB`. O banco é único e compartilhado por todos os administradores autorizados.

Publicar uma nova versão do código não recria nem apaga o banco. Alterações futuras de estrutura devem ser feitas por novas migrações em `drizzle/`; migrações já publicadas não devem ser modificadas ou executadas manualmente outra vez.

Rascunhos e preferências temporárias podem ficar no navegador, mas orçamentos, pedidos, estoque, clientes, consignados, configurações e lançamentos financeiros usam o banco compartilhado como fonte definitiva.

## Validação antes de publicar

1. Confirmar que não existem alterações locais inesperadas com `git status`.
2. Executar `pnpm lint` e `pnpm build`.
3. Verificar que `.env`, credenciais, dependências, artefatos de compilação e a pasta `work/` não estão versionados.
4. Publicar pelo fluxo do Sites preservando o mesmo `project_id` e o binding `DB`.
5. Sincronizar o GitHub somente quando solicitado, conferindo divergências antes do envio para `origin/main`.

## Atualizações futuras

Mudanças de interface e regras de negócio podem ser publicadas sem afetar os registros existentes. Quando uma mudança exigir novas colunas ou tabelas, deve ser criada uma migração incremental e compatível com os dados já gravados. Nunca trocar o `project_id`, remover o binding `DB` ou limpar tabelas durante uma atualização normal.
