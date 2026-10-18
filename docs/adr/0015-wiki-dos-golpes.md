# 0015. Wiki dos golpes com resumos próprios, atualizada pelo GitHub

- Status: Aceita
- Data: 2026-10-18

## Contexto
O Vitor quer, em cada golpe do app, a visão geral, os setups (cada um com sua página) e o final, com base no GTA Wiki (gta.fandom.com). As telas não acessam a internet ([ADR 0007](0007-rede-so-github.md)) e o texto do Fandom é CC BY-SA.

## Decisão
- Cada golpe tem seu item no menu Golpes (sem página "Todos os golpes"), com as abas **Visão geral, Setups, Final** e, quando houver, Calculadora, Mapa e Digitais. A última aba aberta fica guardada por página.
- O conteúdo fica em `data/wiki.json` (`version` + `heists.<id>`), escrito por nós em pt-BR: resumos práticos, nunca cópia do Fandom. Cada golpe, setup e final leva o link do artigo original (`source`), e as telas mostram o crédito "GTA Wiki (Fandom, CC BY-SA)".
- `wiki-feed.cjs` baixa `data/wiki.json` do `main` no GitHub (como os bônus da semana), valida o formato e só troca se `version` for maior. Corrigir conteúdo = editar o JSON e subir `version`, sem release.
- O progresso dos setups fica no estado (`heistProgress.<id>`), com botão Zerar para um golpe novo.
- "Ver no GTA Wiki" abre o navegador pelo processo principal, só para links `https://gta.fandom.com/wiki/...`.
- Para coletar o texto do Fandom: a API (`api.php?action=parse&prop=wikitext`) com User-Agent de navegador funciona; as páginas normais e o dump retornam 403. Isso só serve para escrever o resumo, não para o app.

## Consequências
- Mais golpes são só conteúdo novo no JSON e uma página com as abas (veja `app/pages/heist-pages.js`).
- `test/wiki.test.cjs` garante o formato, os links de fonte e que um JSON quebrado ou vazio não substitui o atual.
