---
name: gta-heist-wiki
description: Escrever ou corrigir a wiki de um golpe (data/wiki.json) e criar a página de um golpe novo no menu Golpes do GTA Helper.
---

# Wiki dos golpes

Decisão em [ADR 0015](../../../docs/adr/0015-wiki-dos-golpes.md). Renderização em `app/pages/heist-wiki.js`, validação em `wiki-feed.cjs` (`validWiki`).

## Formato de `data/wiki.json`
`{ version: "AAAA-MM-DD[.n]", heists: { <id>: heist } }`. Cada golpe:
- `id`, `name`, `source` (artigo do GTA Wiki), `facts` [{label, value}], `overview` [parágrafos], `start` [itens], `approaches` [{id, name, summary}] (ou []).
- `sections` opcional [{id, title, note}]: grupos da tela de planejamento do jogo (ex. Cayo: Approach Vehicle, Equipment, Weapon Loadout, Disruption). Quando existe, todo setup tem `section`.
- `setups` na ordem do jogo: `id`, `name` (sem "Heist Prep:"), `kind` (`scope`, `setup`, `prep`, `optional`), `group` opcional (pílula, ex. "Veículo de entrada (escolha 1)"), `players`, `approaches` opcional (ids), `goal` (1 frase), `steps` (3 a 8), `tips`, `source`.
- `finale`: `name`, `summary`, `roles` opcional, `steps`, `tips`, `source`, `variants` opcional [{approach, name, summary, steps, tips, source}] quando o final muda por approach.

## Como escrever
- pt-BR, com as próprias palavras e foco em quem vai jogar a missão agora. Nunca copie frases do Fandom (CC BY-SA). Nomes do jogo ficam em inglês.
- Só o que a wiki confirma. Valores de pagamento vêm de `data/heists.json`, para o app não se contradizer.
- Coleta: `https://gta.fandom.com/api.php?action=parse&page=<Título>&prop=wikitext|links&redirects=1&format=json` com User-Agent de navegador (as páginas normais dão 403). Os textos brutos já coletados ficam em `/mnt/project-files/gta-helper/wiki-raw/` quando existir.

## Corrigir conteúdo (sem versão nova)
1. Edite `data/wiki.json` e aumente `version` (ex. `2026-10-18` → `2026-10-18.1`).
2. `node --test test/wiki.test.cjs`.
3. Commit e push no `main`: os apps baixam em até 6 h (ou ao abrir).

## Golpe novo
1. Adicione o golpe em `data/wiki.json` (passo acima).
2. Adicione o id e o título em `HEISTS` de `app/pages/heist-pages.js` e o botão no menu Golpes (`data-page="<id>"`, ícone em `app/icons.js`).
3. (A página recarrega sozinha quando a wiki muda: `window.HeistPages` já entra no `onWiki` de `app/app.js`.)
4. Rode `tools/capture.cjs`, olhe os prints e publique a versão com release notes (skill gta-helper-release).
