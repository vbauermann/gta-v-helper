# 0003. Timers contam só tempo de jogo online

- Status: Aceita
- Data: 2026-10-16

## Contexto
Os negócios do GTA Online só produzem e consomem suprimentos com o jogador numa sessão online. Um relógio comum ("acaba às 22h") ficaria errado assim que o jogo fecha.

## Decisão
- Cada negócio guarda um retrato (`supplyPct`, `stock`) e os minutos ativos desde então (`activeMinutes`); `lib/production.js` projeta o estado atual a partir disso. Editar um negócio "rebaseia" o retrato (`store.rebase`).
- O tempo só avança enquanto `GTA5.exe` ou `GTA5_Enhanced.exe` estão abertos (modo padrão) ou sempre com o app aberto (modo "sempre"), e nunca com os timers pausados (menu, modo história, loading).
- Cada tick avança no máximo 30 s, para que um PC suspenso não conte horas de produção.
- Tempos por combinação de upgrades vêm de `data/businesses.json` com a fonte de cada valor; o jogador pode calibrar cada negócio medindo no jogo.
- Alertas viram notificações do Windows (suprimento acabando, acabou, estoque cheio).

## Consequências
- Os números são estimativas até o jogador calibrar; a tela de Ajustes explica isso.
- A detecção de jogo aberto não sabe se o jogador está online ou no modo história; por isso existe o botão de pausa.
