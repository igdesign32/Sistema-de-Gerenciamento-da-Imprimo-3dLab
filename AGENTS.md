# Sincronização e controle de versões

Este projeto usa o repositório `origin` no GitHub e a branch principal `main` como histórico oficial do código.

## Fluxo manual de sincronização

1. Não executar `fetch`, `pull` ou `push` no repositório `origin` automaticamente.
2. Implementar e validar normalmente as mudanças solicitadas, preservando sempre alterações locais do usuário.
3. Só sincronizar com o GitHub quando o usuário pedir explicitamente, por exemplo: “sincronize com o GitHub”.
4. Quando a sincronização for solicitada, buscar atualizações do `origin`, verificar divergências, criar um commit descritivo para as alterações pendentes e enviar a branch `main` para `origin/main`.
5. Se houver divergência ou conflito com o remoto, interromper e pedir orientação antes de modificar o histórico.
6. Não versionar credenciais, arquivos `.env`, dependências, caches ou artefatos temporários de compilação.
7. Commits locais continuam permitidos quando forem tecnicamente necessários para publicar o Site, mas não devem ser enviados ao GitHub sem solicitação explícita.
8. Ao concluir uma sincronização manual, confirmar ao usuário o commit e se o envio ao GitHub foi concluído.

Não realizar `push --force`, reescrever histórico ou apagar branches sem solicitação explícita do usuário.

## Publicação automática do Site

Após implementar e validar qualquer alteração solicitada no sistema, publicar automaticamente a nova versão no Site atual para que o usuário possa visualizá-la, salvo quando o usuário disser explicitamente “não publique” ou pedir trabalho somente local.

Na publicação automática:

1. Interromper a publicação se a compilação ou a validação falhar.
2. Criar o commit local descritivo necessário para a versão do Site.
3. Enviar o commit somente ao repositório interno de publicação do Sites, salvar uma nova versão, publicá-la e aguardar a confirmação de sucesso.
4. Preservar o banco de dados, as variáveis do ambiente, a lista de administradores, o domínio e o modo de acesso existentes.
5. Não executar `fetch`, `pull` ou `push` no `origin` do GitHub. A sincronização com o GitHub continua exigindo o pedido separado “sincronize com o GitHub”.
6. Pedir confirmação específica somente se a publicação exigir apagar ou migrar dados de forma destrutiva, trocar o domínio, alterar administradores ou mudar o modo de acesso.
