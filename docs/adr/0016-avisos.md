# 0016. Avisos: histórico no app, sino, notificação do Windows e lembretes

- Status: Aceita
- Data: 2026-10-19

## Contexto
Os avisos (suprimento acabando, sem suprimento, estoque cheio, Cayo liberado) só existiam como notificação do Windows: quem não viu na hora perdia. O Vitor pediu um sino no topo e um menu Avisos com a lista inteira e o número de não lidos, além de lembretes que se repetem ("Conferir o Terrorbyte a cada 1 ou 2h"), configurados nos Ajustes.

## Decisão
- Todo aviso passa por `notify()` no processo principal: entra em `state.notices.items` (mais novo primeiro, até 100) e, com "Notificações do Windows" ligado, vira notificação do Windows. Clicar nela abre a tela do aviso (`gta:navigate`).
- Tipos: negócios (`warn`, `empty`, `full`), Cayo (`heist`), semana nova (`week`, uma vez por `resetUtc`), versão pronta (`update`, uma vez por versão), lembretes (`reminder`) e teste.
- Lembretes ficam em `state.notices.reminders` (`lib/notices.js`): nome, intervalo (5 min a 24 h), ligado e "só com o GTA aberto". Os de jogo só andam quando os timers contam (GTA aberto e não pausado), os outros andam com o app aberto. O primeiro uso já cria "Conferir o Terrorbyte" a cada 2h de jogo.
- Sino no título (contador vermelho, lista dos 6 últimos, "Ver todos os avisos") e menu Avisos com o contador. Abrir o sino ou a tela marca tudo como lido; os não lidos continuam destacados até sair da tela.

## Consequências
- Um aviso perdido no Windows continua no app.
- Qualquer aviso novo deve usar `notify()` com `page` para o clique levar à tela certa.
