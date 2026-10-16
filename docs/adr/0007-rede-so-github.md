# 0007. Só o processo principal acessa a internet, e só o GitHub

- Status: Aceita
- Data: 2026-10-16

## Contexto
As telas mostram texto vindo de arquivos de dados. Se tivessem internet, um arquivo de dados alterado poderia carregar conteúdo externo. O app só precisa de rede para as atualizações e para os bônus da semana.

## Decisão
- `session.webRequest.onBeforeRequest` em `main.cjs` cancela qualquer requisição que venha de uma página (`webContentsId` definido) e que não seja `file:`/`devtools:`.
- Requisições do processo principal só passam para HTTPS em `github.com`, `api.github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` e `raw.githubusercontent.com`.
- A CSP das páginas tem `connect-src 'none'`. Todo texto entra no DOM por `textContent` (`UI.h`), nunca como HTML.
- Permissões do navegador (câmera, notificações web etc.) são negadas.

## Consequências
- Qualquer integração nova com outro site precisa de ADR e de entrar na lista de hosts.
- Os dados baixados (bônus da semana) são validados antes de usar (`weekly-feed.cjs`).
