# 0001. Electron com JavaScript puro, sem bundler nem framework

- Status: Aceita
- Data: 2026-10-16

## Contexto
O Vitor já mantém outro app desktop (Roxy) em Electron e quer o mesmo padrão. O app é pequeno, roda só no Windows e precisa de overlays por cima do jogo, atalhos globais e bandeja. Tauri foi considerado e descartado para não ter dois padrões.

## Decisão
- Electron (versão fixada em `package.json`), módulos CommonJS `.cjs` no processo principal.
- Telas em HTML/CSS/JS puro em `app/`, sem React, sem bundler, sem TypeScript. Cada tela é um IIFE que registra `window.Pages.<id>` com `mount`, `onState` e `onSecond`.
- Lógica compartilhada entre processo principal, telas e testes fica em `lib/*.js` no formato UMD (funciona com `require` e com `<script>`).
- Testes com `node --test`, sem dependências extras.

## Consequências
- Não há passo de build para rodar: `npm start` abre o app.
- Toda dependência nova entra no instalador; prefira código próprio pequeno a bibliotecas.
- A CSP proíbe script e estilo inline, então estilos dinâmicos são aplicados via `el.style` (CSSOM) e eventos via `addEventListener`.
