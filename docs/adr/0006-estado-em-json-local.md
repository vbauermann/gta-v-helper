# 0006. Estado do usuário em um JSON local

- Status: Aceita
- Data: 2026-10-16

## Contexto
Os dados são de um jogador só e cabem em poucos KB: negócios, ajustes, cooldown do Cayo, tarefas.

## Decisão
- `store.cjs` guarda tudo em `%APPDATA%/GTA Helper/gta-helper.json` (variável `GTA_HELPER_DATA` troca o arquivo nos testes e prints).
- Gravação atômica (`.tmp` + rename). Arquivo ilegível é copiado para `.bak` e o app começa limpo.
- `load()` mescla com os padrões, então campos novos não exigem migração. Mudanças passam pelo processo principal via IPC (`mutate`), que valida a entrada, grava e transmite o estado novo às telas.
- Marcações do mapa do Cayo ficam no `localStorage` da tela (são descartáveis).

## Consequências
- O instalador e a versão portátil usam a mesma pasta, então os dados passam de uma para a outra.
- Desinstalar não apaga os dados (`deleteAppDataOnUninstall: false`).
