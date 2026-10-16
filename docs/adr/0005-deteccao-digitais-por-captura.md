# 0005. Digitais do Casino detectadas por captura de tela e correlação

- Status: Aceita
- Data: 2026-10-16

## Contexto
No hack de digital do Diamond Casino a tela mostra a digital grande ("Clone target") à direita e 8 peças à esquerda; 4 peças são recortes da digital grande. O Vitor joga em 3440x1440 e mandou prints reais da tela, guardados como fixtures.

## Decisão
- Enquanto o GTA está aberto e a marcação automática está ligada, `fp-scanner.cjs` captura a tela principal a cada ~900 ms em tons de cinza, com 360 px de altura.
- `lib/fp-match.js` recorta a digital grande e as 8 peças por **geometria relativa à altura da tela, centrada na horizontal** (medida em 3440x1440). Para cada peça calcula a correlação cruzada normalizada (NCC) contra a digital grande, em escalas de 1,2x a 1,4x (as peças aparecem ~1,3x maiores dentro da digital grande), primeiro em meia resolução e depois refinando.
- Antes da correlação, um filtro barato confirma que a tela parece o hack (média escura e contraste mínimo). Decide "achou" quando a 4ª melhor peça tem nota ≥ 0,72 e uma folga ≥ 0,12 sobre a 5ª.
- A correlação roda numa worker thread (`lib/fp-worker.cjs`) para não travar a interface. No instalador, `lib/` vai fora do asar (`asarUnpack`), porque workers não carregam de dentro do asar.
- O marcador desenha bordas verdes nas 4 peças; desligar (atalho `Ctrl+Shift+D` ou chave no app) esconde na hora.

## Consequências
- Validado nos 5 prints reais em 3440x1440 (`test/fixtures`). Telas 16:9 ainda não foram verificadas: se a geometria não bater, é preciso medir em prints dessa proporção e ajustar `GEOMETRY`.
- Variáveis de teste: `GTA_HELPER_FAKE_SCREEN` aponta para um `.pgm.gz` que substitui a captura real.
- Detalhes de manutenção na skill [gta-fingerprint](../../.claude/skills/gta-fingerprint/SKILL.md).
