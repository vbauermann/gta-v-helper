# 0008. Instalador NSIS com atualização automática pelos releases

- Status: Aceita
- Data: 2026-10-16

## Contexto
O Vitor quer distribuir o app para amigos e que todos recebam as versões novas sem baixar zip na mão. O repositório `vbauermann/gta-v-helper` é público.

## Decisão
- `electron-builder` gera o instalador NSIS (`GTA-Helper-Setup-x.y.z.exe`): um clique, por usuário, atalho na área de trabalho e no menu Iniciar. Configuração no campo `build` do `package.json`.
- `electron-updater` (`updater.cjs`) procura versão nova ao abrir e a cada 4 h, baixa em segundo plano e mostra "Reiniciar e atualizar" na barra lateral e em Ajustes. Só funciona no app instalado; em desenvolvimento e na versão portátil fica desligado.
- O workflow `.github/workflows/release.yml` roda no Windows quando o `version` do `package.json` muda na `main` (ou manualmente pela aba Actions): testa, gera o instalador e publica o release `vX.Y.Z` com o `.exe`, o `.blockmap` e o `latest.yml`. Uma versão que já tem `latest.yml` no release é ignorada.
- Release por tag não é usado: o ambiente de nuvem do Claude bloqueia enviar tags git.

## Consequências
- O instalador não tem assinatura digital: o Windows mostra "O Windows protegeu o computador" na primeira instalação (Mais informações → Executar assim mesmo).
- Publicar = subir a versão no `package.json` e enviar para a `main`. Ver a skill [gta-helper-release](../../.claude/skills/gta-helper-release/SKILL.md).
- `node package.cjs` continua gerando a pasta portátil para testes rápidos, sem atualização automática.
