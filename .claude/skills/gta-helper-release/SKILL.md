---
name: gta-helper-release
description: Publicar uma versão nova do GTA Helper (instalador + atualização automática pelo GitHub Releases). Use quando uma mudança no app precisa chegar aos usuários.
---

# Publicando uma versão

Contexto em [ADR 0008](../../../docs/adr/0008-instalador-e-atualizacao.md). Mudanças só no `data/weekly.json` **não** precisam de versão: os apps baixam o arquivo da `main`.

## Passos

1. Testes verdes (`npm test`) e prints conferidos (`npm run capture`).
2. Suba `version` no `package.json` (semver: correção = patch, funcionalidade = minor).
3. **Obrigatório:** adicione a entrada da versão no topo de `data/release-notes.json` (`version`, `date`, `title`, `items` em pt-BR, falando do que quem usa vê). O teste `release-notes` falha sem isso e o release não sai ([ADR 0013](../../../docs/adr/0013-release-notes.md)).
4. Commit (versão + notas juntas) e push para a `main`. O workflow `Release` (`.github/workflows/release.yml`) roda sozinho porque o `package.json` mudou. Para rodar na mão: aba Actions → Release → Run workflow.
5. O workflow, no Windows: `npm ci`, `npm test`, `electron-builder --win nsis --x64 --publish never`, e publica o release `vX.Y.Z` com `GTA-Helper-Setup-X.Y.Z.exe`, o `.blockmap` e o `latest.yml`, usando as notas do topo como descrição do release.
6. Confira o release: `https://github.com/vbauermann/gta-v-helper/releases/latest` precisa ter os três arquivos. Sem `latest.yml`, os apps instalados não enxergam a versão.

## Cuidados

- Não use tags para disparar release (o ambiente de nuvem do Claude não consegue enviar tags). O workflow cria a tag ao publicar.
- Se o release existir sem `latest.yml`, rodar o workflow de novo completa os arquivos (`gh release upload --clobber`).
- O instalador não é assinado; avise quem for instalar sobre a tela "O Windows protegeu o computador".
- O app instalado procura atualização ao abrir e a cada 4 h; em Ajustes → Atualizações há "Procurar agora".
- Arquivos que o instalador leva estão em `build.files` do `package.json`. Arquivo novo na raiz (ex.: `novo-modulo.cjs`) precisa entrar lá e em `package.cjs` (versão portátil).
