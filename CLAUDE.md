# GTA Helper: guia para o Claude

App desktop Windows (Electron, JS puro, sem bundler) de apoio ao GTA Online. Dono: Vitor (vbauermann). A interface e as mensagens são em **português do Brasil**.

## Regras que não se quebram

1. **Nunca tocar no jogo.** Nada de ler ou escrever memória do GTA, injetar DLL, hook de DirectX ou enviar teclas ou cliques para o jogo (BattlEye). O app só lista processos (`tasklist`), captura a tela (como o OBS) e desenha janelas próprias por cima. Ver [ADR 0002](docs/adr/0002-nunca-tocar-no-jogo.md).
2. **O app só mostra, o jogador joga.** Nenhuma automação que resolva hack ou faça ação no lugar do jogador.
3. **Segurança do Electron:** `contextIsolation`, `sandbox`, sem `nodeIntegration`, CSP estrita no HTML (sem script ou estilo inline: estilos via CSSOM em JS). As telas não têm internet; só o processo principal fala com o GitHub. Ver [ADR 0007](docs/adr/0007-rede-so-github.md).
4. **Entregar pronto.** O Vitor quer instalador/exe, nunca instruções de `npm`. Versão nova sai pelo fluxo de release ([skill gta-helper-release](.claude/skills/gta-helper-release/SKILL.md)).
5. **Dados de exemplo nunca viram dado real.** Valores do jogo têm fonte em `data/*.json`; estimativas são marcadas como tal.
6. **Toda versão nova tem release notes.** Subiu `version` no `package.json`? No mesmo commit, adicione a entrada no topo de `data/release-notes.json` (aparece na aba Novidades). Sem isso o teste falha e o release não sai. Ver [ADR 0013](docs/adr/0013-release-notes.md).

## Mapa do código

| Caminho | O que é |
|---|---|
| `main.cjs` | Processo principal: janela, bandeja, IPC, ticks dos timers, política de rede |
| `preload*.cjs` | Pontes `contextBridge` (app, overlay das digitais, marcador/aviso) |
| `store.cjs` | Estado do usuário em JSON na pasta userData (negócios, ajustes, tarefas) |
| `timers.cjs`, `lib/production.js` | Produção e suprimentos dos negócios, alertas |
| `game-watcher.cjs` | Detecta `GTA5.exe`/`GTA5_Enhanced.exe` pela lista de processos |
| `overlay.cjs`, `lib/hotkeys.js` | Overlay de referência das digitais e atalhos globais |
| `fp-scanner.cjs`, `lib/fp-match.js`, `lib/fp-worker.cjs` | Detecção automática das digitais do Casino por captura de tela |
| `biz-scanner.cjs`, `lib/biz-read.js`, `lib/biz-apply.js`, `data/biz-read.json` | Leitura da tela do Master Control Terminal (Terrorbyte) e do Sell Goods do Nightclub; modelos gerados por `tools/build-biz-templates.cjs`. Ver [ADR 0018](docs/adr/0018-leitura-da-tela-dos-negocios.md) |
| `game-window.cjs` | Posição da janela do GTA na tela (modo janela), via user32 em um loop PowerShell |
| `lib/heists.js`, `data/heists.json` | Cálculos de Cayo Perico e Diamond Casino |
| `data/cayo-map.json`, `app/pages/cayo-map.js` | Mapa do Cayo (pontos de alvos, guardas, entradas) |
| `data/ls-map.json`, `lib/ls-map.js`, `app/pages/map.js` | Mapa de Los Santos (negócios, propriedades, garagens, animais), gerado por `tools/build-ls-map.cjs`; zoom em `app/map-zoom.js` |
| `data/wiki.json`, `wiki-feed.cjs`, `app/pages/heist-wiki.js` | Wiki dos golpes (abas Visão geral, Setups, Final em cada golpe; baixada do repositório). Ver [ADR 0015](docs/adr/0015-wiki-dos-golpes.md) e a skill gta-heist-wiki |
| `lib/nightclub.js`, `app/pages/biz-extra.js` | Nightclub (produção dos técnicos), warehouses de cargo (CEO) e Vehicle Warehouse nos Negócios. Ver [ADR 0017](docs/adr/0017-nightclub-e-warehouses.md) |
| `lib/todos.js`, `app/pages/todos.js` | Tarefas diárias e semanais |
| `lib/notices.js`, `app/pages/notices.js` | Avisos: sino no título, menu Avisos, lembretes periódicos (configurados nos Ajustes); todo aviso passa por `notify()` no `main.cjs`. Ver [ADR 0016](docs/adr/0016-avisos.md) |
| `data/weekly.json`, `weekly-feed.cjs`, `app/pages/weekly.js` | Bônus da semana (baixados do repositório) |
| `updater.cjs` | Atualização automática pelos releases do GitHub |
| `data/release-notes.json`, `app/pages/releases.js` | Release notes e aba Novidades |
| `app/` | Telas (HTML/CSS/JS sem framework), `app/ui.js` tem os helpers de DOM |
| `tools/capture.cjs` | Abre o app com dados de exemplo e salva prints em `captures/` |
| `docs/adr/` | Decisões de arquitetura ([índice](docs/adr/README.md)) |
| `.claude/skills/` | Skills deste projeto |

## Comandos

```bash
npm install
npm start                       # roda o app
npm test                        # testes (node --test); fp-match é o mais lento
npm run capture                 # prints de todas as telas em captures/ (no Linux: xvfb-run -a npx electron --no-sandbox tools/capture.cjs)
npm run dist                    # instalador NSIS em release/ (precisa de Windows ou Wine)
node package.cjs                # pasta portátil em dist/ (funciona no Linux, sem atualização automática)
```

## Skills

- [gta-helper-dev](.claude/skills/gta-helper-dev/SKILL.md): como mexer no app (telas, IPC, estado, estilo, testes, prints).
- [gta-helper-release](.claude/skills/gta-helper-release/SKILL.md): publicar uma versão nova.
- [gta-weekly-update](.claude/skills/gta-weekly-update/SKILL.md): atualizar os bônus da semana toda quinta.
- [gta-heist-wiki](.claude/skills/gta-heist-wiki/SKILL.md): escrever ou corrigir a wiki de um golpe e criar a página de um golpe novo.
- [gta-fingerprint](.claude/skills/gta-fingerprint/SKILL.md): detecção das digitais do Casino (geometria, limiares, fixtures).

## Fluxo de trabalho

- Commits pequenos, mensagem em português no imperativo/descritiva, como no histórico.
- Antes de entregar mudança visual: rodar `tools/capture.cjs` e olhar o print. Teste passando não prova que a tela ficou certa.
- Mudou uma decisão? Atualize ou crie a ADR correspondente em `docs/adr/`.
