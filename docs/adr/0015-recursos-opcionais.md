# 0015. Recursos de colaboradores vêm desligados, com chave em Ajustes

- Status: Proposta
- Data: 2026-10-16

## Contexto
O Vinícius entrou como colaborador. O app é do Vitor, que publica versões várias vezes por dia direto na `main`. Um recurso novo de colaborador precisa poder entrar no repositório sem mudar o app de quem não pediu, e sem atrapalhar esse ritmo de releases.

## Decisão
- Todo recurso novo de colaborador é **opcional e vem desligado**. Ele entra em `FEATURES` de `lib/features.js` (`id`, `title`, `description`) e ganha uma chave no card "Recursos extras" de Ajustes. O card só aparece quando a lista tem algum recurso.
- A escolha do jogador fica em `settings.features` (`{ id: true }`). `normalize` descarta ids que saíram da lista, e a mudança passa por `gta:set-settings`, que só aceita id conhecido com valor booleano (`sanitizePatch`).
- O recurso confere `GtaFeatures.isOn(settings, id)` antes de aparecer (item no menu, card, janela) ou de rodar algo no processo principal.
- A chave não libera o que as outras ADRs proíbem, como tocar no jogo ([ADR 0002](0002-nunca-tocar-no-jogo.md)): o código vai no instalador de todo mundo, ligado ou não.
- Fluxo de colaboração: branch e PR, nunca push direto na `main`. PR de colaborador não sobe `version`, porque publicar é decisão do Vitor. O código do recurso fica em arquivos próprios, com o mínimo de linhas nos arquivos que mudam a toda hora (`main.cjs`, `preload.cjs`, `store.cjs`, `app/index.html`, `package.json`).

## Consequências
- Quem não liga nada vê o app como antes.
- Cada recurso opcional precisa funcionar com a chave ligada e desligada.
- Para tornar um recurso padrão do app, o Vitor tira a entrada de `FEATURES` e as checagens de `isOn`.
