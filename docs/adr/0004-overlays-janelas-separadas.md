# 0004. Overlays são janelas separadas, transparentes e click-through

- Status: Aceita
- Data: 2026-10-16

## Contexto
Desenhar dentro do jogo exige hook de DirectX, que a [ADR 0002](0002-nunca-tocar-no-jogo.md) proíbe. Em tela cheia exclusiva, qualquer janela por cima faz o jogo minimizar.

## Decisão
- Overlays são `BrowserWindow` próprias: transparentes, sem moldura, `alwaysOnTop` no nível `screen-saver`, sem foco e com `setIgnoreMouseEvents(true)` (os cliques passam para o jogo).
- O jogo precisa estar em **Janela sem bordas (Borderless Windowed)**; o app avisa isso.
- Três janelas: o overlay de referência das digitais (`overlay.cjs`, com "modo mover" para arrastar), o marcador de peças da detecção automática e o aviso "Detecção de digitais" no canto superior direito (`fp-scanner.cjs`).
- As janelas do app que ficam por cima do jogo usam `setContentProtection(true)`, para não aparecerem na própria captura de tela.

## Consequências
- Borderless pode custar alguns FPS em relação à tela cheia exclusiva.
- Cada janela tem o próprio preload restrito (`preload-overlay.cjs`, `preload-marker.cjs`).
