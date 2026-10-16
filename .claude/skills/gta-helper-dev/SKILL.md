---
name: gta-helper-dev
description: Como desenvolver no GTA Helper (Electron + JS puro) - telas, IPC, estado, estilo, testes e prints. Use ao criar ou alterar qualquer funcionalidade do app.
---

# Desenvolvendo no GTA Helper

Leia antes o [CLAUDE.md](../../../CLAUDE.md) e as ADRs em `docs/adr/`. Regra número um: o app nunca toca no processo do jogo ([ADR 0002](../../../docs/adr/0002-nunca-tocar-no-jogo.md)).

## O que já existe

| Tela (`data-page`) | Arquivo | O que faz |
|---|---|---|
| Visão geral (`overview`) | `app/pages/overview.js` | Resumo dos negócios (valor em estoque, suprimento mais baixo, próximo a parar) e pausa dos timers |
| Negócios (`businesses`) | `app/pages/businesses.js` | Negócios que o jogador tem, upgrades, ressuprir/vender, informar níveis, calibração, boost diário do Acid Lab |
| Semana (`weekly`) | `app/pages/weekly.js` | Bônus, descontos, veículos, Gun Van, GTA+, contagem até quinta, marca "pra você" |
| Tarefas (`todos`) | `app/pages/todos.js` | Listas diária e semanal, sugestões, horário do reset |
| Cayo Perico (`cayo`) | `app/pages/cayo.js`, `cayo-map.js` | Calculadora (alvo primário, secundários com slider, bolsas, cortes, modo difícil, Elite), cooldown, aba Mapa |
| Diamond Casino (`casino`) | `app/pages/casino.js`, `fingerprint.js` | Abas Calculadora (abordagem, alvo, equipe, cortes) e Digitais (overlay de referência, detecção automática) |
| Tabela de payouts (`payouts`) | `app/pages/payouts.js` | Payouts da atualização de economia |
| Ajustes (`settings`) | `app/pages/settings.js` | Contagem de tempo, avisos, atualizações, tema |

Fora da janela principal: bandeja (fechar mantém rodando), notificações do Windows, overlay das digitais com atalhos globais (`Ctrl+Shift+F`, `0`–`4`, `M`), marcador automático das peças e aviso "Detecção de digitais" (`Ctrl+Shift+D`).

## Como uma tela funciona

1. Crie `app/pages/<id>.js` como IIFE que registra `window.Pages.<id> = { mount(el), onState(state, force), onSecond() }`.
2. Monte o DOM com `UI.h(tag, attrs, ...filhos)` e `UI.fill(el, ...)`. Nunca use `innerHTML` com dados. Helpers prontos em `app/ui.js`: `money`, `pct`, `number`, `field`, `numberInput`, `select`, `checkbox` (switch), `segmented`, `icon`, `bizIcon`, `ring`, `bar`.
3. Adicione o `<button class="nav-item" data-page="<id>" data-icon="...">` e o `<script src="pages/<id>.js">` em `app/index.html` (antes de `app.js`).
4. Ícones novos: path SVG de linha em `LINE` de `app/icons.js` (estilo Lucide, 24x24).
5. Estilos em `app/styles/app.css`, usando os tokens de `nexo.css` (`--card`, `--card-2`, `--border`, `--muted`, `--faint`, `--accent`, `--ok`, `--warn`, `--danger` e as versões `-soft`/`-line`). Nada de estilo inline no HTML (CSP); em JS use `el.style.x = ...`.
6. `App.state` é o estado vindo do processo principal; `App.data` tem `catalog`, `heists` e `weekly`. `App.act(promise)` aplica a resposta do IPC e mostra erro em toast.

## Estado e IPC

- Estado persistente: `store.cjs` (`load` mescla com padrões; campo novo não precisa de migração).
- Toda escrita passa por um `ipcMain.handle('gta:...')` em `main.cjs` dentro de `mutate(s => ...)`, que valida, grava e envia o estado novo. Exponha a chamada em `preload.cjs` (lista fechada, nada genérico).
- Valide tudo que vem da tela no processo principal (`num()`, listas de valores permitidos, `todos.sanitize`).
- Lógica pura que as telas e os testes também usam vai em `lib/*.js` no formato UMD.

## Dados do jogo

- `data/businesses.json`, `data/heists.json`: valores com fonte. Ao mudar um número, atualize `version`/`sources`.
- `data/weekly.json`: ver a skill [gta-weekly-update](../gta-weekly-update/SKILL.md).
- `data/cayo-map.json`: gerado por `tools/build-cayo-map.cjs`, não edite à mão.

## Verificar

1. `npm test` (os testes de digitais são os mais lentos).
2. Prints: `npm run capture` (no Linux sem tela: `xvfb-run -a -s "-screen 0 1600x1000x24" npx electron --no-sandbox tools/capture.cjs`). Saem em `captures/<tela>.png`; o script também confere mapa do Cayo, tarefas e detecção de digitais e lista erros no fim. Ao criar uma tela, inclua-a no laço de páginas de `tools/capture.cjs`.
3. Abra os PNG e confira o visual. Teste verde não prova que a tela está certa.

## Estilo de código

- Comentários curtos em inglês explicando o porquê; textos da interface em pt-BR.
- Funções pequenas, sem frameworks, sem dependências novas sem necessidade (entram no instalador).
- Commits pequenos com mensagem descritiva em português.
