---
name: gta-fingerprint
description: Manutenção da detecção automática das digitais do Diamond Casino (lib/fp-match.js, fp-scanner.cjs) - geometria, limiares, fixtures, novas resoluções. Use quando a marcação errar, não aparecer ou precisar de outra proporção de tela.
---

# Detecção das digitais do Casino

Contexto em [ADR 0005](../../../docs/adr/0005-deteccao-digitais-por-captura.md). Só captura de tela; nunca enviar input ao jogo.

## Peças

- `lib/fp-match.js` (UMD): `GEOMETRY` (posições em unidades da altura da tela, x a partir do centro), `tileRect(i, w, h)` e `analyze(img)` → `{ found, picks, scores }`.
- `lib/fp-worker.cjs`: roda `analyze` numa worker thread.
- `game-window.cjs`: retângulo da área cliente da janela do GTA (modo janela), em pixels físicos, via loop PowerShell com user32; `parseRect` é testado.
- `fp-scanner.cjs`: captura (`desktopCapturer`, cinza, área do jogo com ~360 px de altura) a cada 900 ms enquanto o GTA está aberto e a marcação está ligada; janelas do marcador e do aviso; some com as bordas após 2 leituras sem achar.
- `app/marker.*`, `app/badge.*`, `preload-marker.cjs`: desenho das bordas e do aviso.

## Fixtures e testes

- `test/fixtures/hack-1..5.pgm.gz`: prints reais do Vitor (3440x1440) reduzidos para 360 px de altura. Respostas esperadas em `test/fp-match.test.cjs`.
- `not-hack.pgm.gz`, ruído e imagem vazia precisam ser rejeitados.
- Para testar o app inteiro sem jogo: `GTA_HELPER_FAKE_SCREEN=test/fixtures/hack-1.pgm.gz` faz o scanner usar o arquivo no lugar da tela (o `tools/capture.cjs` já faz isso).

## Criar uma fixture a partir de um print

Converta para cinza com 360 px de altura, mantendo a proporção, e grave como PGM binário compactado: cabeçalho `P5 <largura> <altura> 255\n` seguido dos bytes, tudo em gzip. Anote as 4 peças corretas (índices 0 a 7, linha a linha, 2 colunas) e adicione o caso ao teste.

## Ajustes comuns

- **Outra proporção de tela (ex.: 16:9):** meça em prints dessa proporção onde ficam a primeira peça, o passo entre peças e a digital grande; se a interface do hack não escalar só com a altura, `GEOMETRY` precisará de um caso por proporção. Adicione fixtures antes de mudar.
- **Falso positivo fora do hack:** endureça o filtro `looksLikeHack` (média/contraste) antes de mexer nos limiares.
- **Não acha peças certas:** confira os `scores` no teste; os limiares são `MIN_SCORE` (0,72 para a 4ª melhor) e `MIN_GAP` (0,12 para a 5ª).
- O teste `fp-match` é pesado; rode só ele com `node --test test/fp-match.test.cjs` enquanto ajusta.
