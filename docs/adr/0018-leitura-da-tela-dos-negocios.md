# 0018. Leitura da tela dos negócios (Terrorbyte e Nightclub)

- Status: Aceita
- Data: 2026-10-19

## Contexto
O Vitor queria que o app pegasse estoque e suprimentos direto do jogo. Memória, arquivos e API foram descartados (BattlEye, ADR 0002; save no servidor; nada útil na API). Sobrou capturar a tela, como nas digitais (`/mnt/project-files/gta-helper/leitura-do-jogo-analise.md`). O ideal, segundo ele, é o Master Control Terminal do Terrorbyte, que mostra todos os negócios; o Nightclub tem a tela Sell Goods com cada mercadoria.

## Decisão
- `biz-scanner.cjs` captura em cores a tela onde está o mouse a cada 2 s, em 540 px de altura (`probe`: lê o MCT e só percebe o Nightclub). A captura grande (até 1440 px) só acontece com a tela Sell Goods aberta e, depois de lida, no máximo a cada 10 s: a captura grande a cada 2 s travava o app (v1.13.0). Roda só com o GTA aberto e a opção "Ler as telas dos negócios" ligada (padrão). A análise roda num worker (`lib/biz-worker.cjs`); os modelos vão por `workerData`, porque o worker não lê de dentro do app.asar.
- `lib/biz-read.js`:
  - **MCT**: acha as barras pela cor (verde = estoque, azul = suprimentos; trilho escuro levemente tingido) em qualquer resolução e ordem, junta pedaços cortados pelo ponteiro e identifica o card pelo título (NCC contra modelos na largura canônica da barra). Card sem título visível (página rolada) é ignorado.
  - **Nightclub Sell Goods**: acha os quadros pela borda lilás, identifica a mercadoria pelo nome e lê "unidades/capacidade" com modelos de dígitos. Abaixo de 13 px de altura de dígito não lê, para não confundir 6 com 8.
  - Os modelos ficam em `data/biz-read.json`, gerado por `tools/build-biz-templates.cjs` a partir dos prints em `test/fixtures/biz` (MCT a 720 px, Nightclub a 1080 px).
- Uma leitura só vale quando aparece igual em duas capturas seguidas, e só é aplicada de novo quando muda. `lib/biz-apply.js` aplica como "Informar níveis": marca o negócio como seu, troca estoque e suprimentos quando a diferença passa da tolerância, limpa suprimentos a caminho que já chegaram; no Nightclub, o total do MCT é distribuído em proporção e o Sell Goods dá cada mercadoria e os andares (capacidade ÷ por andar), descartando capacidades incoerentes. Aplica em silêncio (desde a v1.13.5 não gera aviso).

## Consequências
- Só funciona com a tela aberta e o jogo em janela sem borda ou tela cheia capturável.
- Special Cargo e Air-Freight não têm barra no MCT; ficam manuais.
- Medido em 3440x1440; outras resoluções são testadas redimensionando os prints. Prints novos (16:9, outros idiomas) entram em `test/fixtures/biz` e no `LABELS`/`NIGHTCLUB` do gerador.
