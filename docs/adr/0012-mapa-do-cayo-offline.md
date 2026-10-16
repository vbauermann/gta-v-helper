# 0012. Mapa do Cayo Perico com dados offline gerados por script

- Status: Aceita
- Data: 2026-10-16

## Contexto
O Vitor pediu a aba Mapa do Cayo igual ao cayoperico.online (pontos de alvos secundários, roupas de guarda, equipamentos, entradas, baús). As telas não acessam a internet ([ADR 0007](0007-rede-so-github.md)).

## Decisão
- Os pontos, ícones, fotos e o mapa foram extraídos uma vez e convertidos por `tools/build-cayo-map.cjs` em `data/cayo-map.json` e `app/assets/cayo/`, com títulos traduzidos.
- A tela (`app/pages/cayo-map.js`) tem filtros por grupo/categoria, popup com foto, marcações "Achei!"/"Não está aqui" no `localStorage`, zoom até 8x e troca para o mapa 8192 px a partir de zoom 2.

## Consequências
- Atualizar o mapa exige rodar o script de novo com a extração atualizada.
