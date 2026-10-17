# 0014. Mapa de Los Santos construído no app, com o que o jogador tem no estado

- Status: Aceita
- Data: 2026-10-17

## Contexto
O Vitor pediu um mapa do GTA Online no app, parecido com o gtaweb.eu, mostrando negócios, propriedades e garagens (com o nome da garagem no hover, para escolher o fast travel), agência, bail office e animais. Ele pediu para construir o mapa no app como o do Cayo, sem embutir o site. As telas não acessam a internet ([ADR 0007](0007-rede-so-github.md)).

## Decisão
- Posições (coordenadas do jogo), nomes, ícones dos blips e a imagem do mapa (camada "game", parecida com o mapa do menu de pausa) foram extraídos uma vez do gtaweb.eu e convertidos por `tools/build-ls-map.cjs` em `data/ls-map.json` e `app/assets/ls/`. A imagem foi recortada na ilha; a versão HD entra a partir de zoom 2.
- O que o jogador tem fica no estado do app (`state.map.owned`, gravado no JSON do usuário), não no `localStorage`, porque se liga à tela de Negócios: marcar um local de negócio do MC ou Bunker marca "Tenho este" lá, e desmarcar o negócio lá limpa o local. As regras (limite por categoria, ex.: 1 escritório, 3 mansões, garagens sem limite) ficam em `lib/ls-map.js` e são validadas no processo principal.
- Animais: pontos onde cada espécie da fotografia de animais pode aparecer, com o horário do jogo. As espécies comuns têm milhares de pontos; o script guarda um por célula de ~120 m e no máximo 120 por espécie. Começam desligados.
- Gun Van ficou de fora a pedido do Vitor.
- Zoom e arrasto são compartilhados com o mapa do Cayo (`app/map-zoom.js`).

## Consequências
- Atualizar o mapa (novo negócio, nova propriedade) exige baixar de novo o MapConfig e os textos do gtaweb.eu e rodar o script.
