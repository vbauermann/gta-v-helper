# 0002. O app nunca toca no processo do GTA

- Status: Aceita
- Data: 2026-10-16

## Contexto
O GTA Online usa o anti-cheat BattlEye. Ler memória, injetar código, fazer hook de DirectX ou automatizar entradas pode banir a conta, e resolver hacks sozinho é automação proibida pelos termos.

## Decisão
O app pode apenas:
- listar processos do Windows (`tasklist`) para saber se o jogo está aberto;
- capturar a tela com a API do Electron (`desktopCapturer`), como OBS ou a Ferramenta de Captura;
- desenhar janelas próprias por cima do jogo e registrar atalhos globais do Windows.

O app nunca pode: abrir o processo do jogo, ler ou escrever memória, injetar DLL, fazer hook gráfico, enviar teclas, cliques ou movimentos de mouse ao jogo, ou automatizar qualquer ação. Ele mostra a informação; quem joga é o jogador.

## Consequências
- Recursos como "resolver o hack sozinho" estão fora de escopo para sempre.
- Os dados do jogador (negócios, estoque) entram por input manual, porque não existe API oficial.
- Atalhos globais precisam de modificador (Ctrl/Alt/Shift) para não disparar enquanto se digita no chat do jogo (`lib/hotkeys.js`).
