# 0017. Nightclub e warehouses como negócios

- Status: Aceita
- Data: 2026-10-19

## Contexto
Depois do botão de vínculo com o Nightclub (v1.10), o Vitor pediu o Nightclub como negócio, as warehouses de Special Cargo (CEO) e a Vehicle Warehouse (Import/Export) nos Negócios e no mapa de Los Santos.

## Decisão
- **Nightclub** (`state.nightclub`, `lib/nightclub.js`): cada técnico produz a mercadoria de um negócio vinculado, sem suprimentos, enquanto os timers contam. Estoque = foto + minutos ativos, como os outros negócios; qualquer mudança (vínculo, andares, upgrade) faz `rebase` antes. Valores, capacidade por andar (1 a 5) e tempos (o upgrade de equipamento dobra a velocidade) vêm do GTA Wiki (`catalog.nightclub`). Até 5 técnicos, contando o Cargo and Shipments, que precisa de uma warehouse de cargo ou de um Hangar marcado no mapa. Aviso quando tudo que tem técnico enche.
- **Warehouses**: a posse é a marcação no mapa (categorias `warehouse`, até 5, e `vehicle-warehouse`, 1). `syncWarehouses` no `main.cjs` mantém `state.warehouses` igual às marcas, guardando caixas e carros. Caixas são informadas à mão (+1/+2/+3, vendi); o valor segue a tabela de preço por caixa do jogo (`catalog.cargo.sale`).
- Posições, nomes e tamanhos das warehouses vieram do mesmo levantamento do gtaweb.eu (`warehouses.json` ao lado do config, lido por `tools/build-ls-map.cjs`).

## Consequências
- Marcar uma warehouse no mapa ou nos Negócios é a mesma ação.
- A Vehicle Warehouse só conta carros (o valor de venda depende do carro).
