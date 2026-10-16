# 0009. Bônus da semana em um arquivo do repositório

- Status: Aceita
- Data: 2026-10-16

## Contexto
A Rockstar publica bônus, descontos e veículos toda quinta, sem API oficial. Gerar uma versão do app por semana seria pesado para quem usa.

## Decisão
- `data/weekly.json` descreve a semana (início, fim, `resetUtc`, bônus por multiplicador, recompensas, rotações, descontos, veículos, Gun Van, GTA+, fontes) e opcionalmente `todo` (bônus que marcam tarefas e tarefas extras da semana).
- O app traz uma cópia embutida e `weekly-feed.cjs` baixa `https://raw.githubusercontent.com/vbauermann/gta-v-helper/main/data/weekly.json` ao abrir e a cada 3 h. Se for válido e de uma semana igual ou mais nova, salva em `weekly-cache.json` e as telas Semana e Tarefas se atualizam.
- Editar o arquivo na `main` atualiza todos os apps instalados, sem release.

## Consequências
- O formato do arquivo é um contrato: mudar campos obrigatórios quebra versões antigas, que vão ignorar o arquivo novo. Campos novos devem ser opcionais.
- Atualizar o arquivo é trabalho semanal; ver a skill [gta-weekly-update](../../.claude/skills/gta-weekly-update/SKILL.md).
