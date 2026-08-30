# Sincronização e controle de versões

Este projeto usa o repositório `origin` no GitHub e a branch principal `main` como histórico oficial do código.

## Fluxo obrigatório para alterações

1. Antes de iniciar mudanças, verificar o estado local e buscar atualizações do `origin`.
2. Nunca descartar alterações locais do usuário. Se houver divergência ou conflito com o remoto, interromper e pedir orientação.
3. Implementar apenas as mudanças solicitadas e validar o projeto de forma proporcional ao risco.
4. Não versionar credenciais, arquivos `.env`, dependências, caches ou artefatos temporários de compilação.
5. Ao concluir uma alteração validada, criar um commit descritivo na branch `main` e enviar para `origin/main`.
6. Confirmar ao usuário o commit e se a sincronização com o GitHub foi concluída.
7. Se a autenticação ou o envio falhar, manter o commit local intacto e informar claramente o que falta para sincronizar.

Não realizar `push --force`, reescrever histórico ou apagar branches sem solicitação explícita do usuário.
