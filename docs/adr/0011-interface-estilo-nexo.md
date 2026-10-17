# 0011. Interface no estilo do app Nexo, em pt-BR

- Status: Aceita
- Data: 2026-10-16

## Contexto
O Vitor quer que o app pareça com o Nexo, outro app dele: menus, cores e disposição.

## Decisão
- Tema escuro por padrão (claro opcional), fonte Inter embutida, tokens de cor em `app/styles/nexo.css` (`--bg`, `--card`, `--accent` lilás etc.) e componentes do app em `app/styles/app.css`.
- Barra lateral com seções (Visão geral, Negócios, Semana, Tarefas, Golpes, App), cards com `card-head`, pills, segmented, switches, anéis de progresso (`UI.ring`). Na tela de Negócios cada negócio é uma linha que expande, com barras finas de suprimento e estoque (como no jogo), ordenada do maior para o menor suprimento.
- Ícones de linha em `app/icons.js`; os negócios usam a silhueta do ícone do mapa do jogo tingida com a cor do negócio.
- Todo texto em português do Brasil, frases curtas, valores como `GTA$ 1.234.567`.

## Preferências já pedidas pelo Vitor
- Tabela de payouts sem coluna "Antes".
- Observação do cooldown do Cayo ao lado do título do card; "Elite" abaixo de "Modo difícil".
- Alvos secundários do Cayo: só ícone + slider (1 a 10, comportamento de slider: marcar 4 acende 1 a 4) e uma linha de dica "Valor por pilha | Ocupa da bolsa". Dinheiro usa o ícone de cifrão.
- Aviso da detecção de digitais: só "Detecção de digitais" com bolinha verde, sem ON/OFF.
