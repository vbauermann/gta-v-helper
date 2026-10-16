# 0010. Tarefas diárias e semanais com reset do jogo

- Status: Aceita
- Data: 2026-10-16

## Contexto
O Vitor quer uma lista do que fazer: diárias (abastecer negócios, popularidade da boate, cofres, coletáveis) e semanais (golpes com bônus, Dr. Dre, FIB File da semana), marcando o que concluiu.

## Decisão
- Uma tarefa conta como feita enquanto o `doneAt` dela cai dentro do período atual; não há tarefa a "desmarcar" no reset.
- Diárias zeram com o diário do jogo, **06:00 UTC** (03:00 em Brasília), mostrado no horário local. O jogador pode escolher outra hora (`dailyHourSet`).
- Semanais zeram na quinta, na hora UTC do `resetUtc` do `weekly.json` (10:00 UTC por padrão).
- Sugestões com `key` estável ficam em `lib/todos.js`; a primeira execução já traz a lista que o Vitor pediu. Tarefas de "só esta semana" vêm do `weekly.json` com `expiresAt` e somem sozinhas.
- Tudo fica no estado do usuário (`state.todos`), alterado só via IPC `gta:todo`, que valida título, período e chave.

## Consequências
- Bônus da semana marcam tarefas pela `key` (`todo.boosts` no `weekly.json`); manter as chaves estáveis.
