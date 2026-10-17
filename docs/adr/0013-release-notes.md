# 0013. Toda versão publicada tem release notes

- Status: Aceita
- Data: 2026-10-17

## Contexto
O app se atualiza sozinho ([ADR 0008](0008-instalador-e-atualizacao.md)) e vários agentes (e colaboradores) mexem no projeto. Quem usa precisa saber o que mudou, e o Vitor pediu que as notas sejam atualizadas a cada versão, sem depender de alguém lembrar.

## Decisão
- As notas ficam em `data/release-notes.json` (`versions`, da mais nova para a mais antiga): `version`, `date` (AAAA-MM-DD), `title` curto e `items` (frases em pt-BR, do ponto de vista de quem usa o app).
- A aba **Novidades** (`app/pages/releases.js`), abaixo de Ajustes, mostra esse arquivo e marca "sua versão". A barra lateral mostra "novo" depois de uma atualização até a aba ser aberta.
- **Regra para qualquer agente ou pessoa que subir a versão no `package.json`:** no mesmo commit, adicione a entrada dessa versão no topo de `data/release-notes.json`.
- `test/release-notes.test.cjs` falha se a versão do `package.json` não for a primeira do arquivo, se faltar campo ou se a ordem estiver errada. Como o workflow de release roda `npm test`, **sem notas não sai release**.
- O workflow usa a entrada do topo como descrição do release no GitHub.

## Como escrever
- Fale do que a pessoa vê e faz ("Botão Dei boost no card do Acid Lab"), não de arquivos ou funções.
- Uma entrada por versão publicada; correções pequenas juntas na mesma lista.
- Mudanças só no `data/weekly.json` não são versão e não entram aqui.

## Consequências
- Esquecer as notas quebra o CI do release em vez de publicar sem elas.
- Notas antigas não se editam depois de publicadas, salvo para corrigir algo errado.
