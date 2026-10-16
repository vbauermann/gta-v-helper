---
name: gta-helper-release
description: Publicar uma versão nova do GTA Helper (instalador + atualização automática pelo GitHub Releases). Use quando uma mudança no app precisa chegar aos usuários.
---

# Publicando uma versão

Contexto em [ADR 0008](../../../docs/adr/0008-instalador-e-atualizacao.md). Mudanças só no `data/weekly.json` **não** precisam de versão: os apps baixam o arquivo da `main`.

## Passos

1. Testes verdes (`npm test`) e prints conferidos (`npm run capture`).
2. Suba `version` no `package.json` (semver: correção = patch, funcionalidade = minor).
3. Commit e push para a `main`. O workflow `Release` (`.github/workflows/release.yml`) roda sozinho porque o `package.json` mudou. Para rodar na mão: aba Actions → Release → Run workflow.
4. O workflow, no Windows: `npm ci`, `npm test`, `electron-builder --win nsis --x64 --publish never`, e publica o release `vX.Y.Z` com `GTA-Helper-Setup-X.Y.Z.exe`, o `.blockmap` e o `latest.yml`.
5. Confira o release: `https://github.com/vbauermann/gta-v-helper/releases/latest` precisa ter os três arquivos. Sem `latest.yml`, os apps instalados não enxergam a versão.

## Cuidados

- Não use tags para disparar release (o ambiente de nuvem do Claude não consegue enviar tags). O workflow cria a tag ao publicar.
- Se o release existir sem `latest.yml`, rodar o workflow de novo completa os arquivos (`gh release upload --clobber`).
- O instalador não é assinado; avise quem for instalar sobre a tela "O Windows protegeu o computador".
- O app instalado procura atualização ao abrir e a cada 4 h; em Ajustes → Atualizações há "Procurar agora".
- Arquivos que o instalador leva estão em `build.files` do `package.json`. Arquivo novo na raiz (ex.: `novo-modulo.cjs`) precisa entrar lá e em `package.cjs` (versão portátil).
