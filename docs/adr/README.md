# Decisões de arquitetura (ADR)

Cada arquivo registra uma decisão: o contexto, o que foi decidido e o que isso implica. Antes de mudar algo que uma ADR cobre, atualize a ADR (ou escreva uma nova que a substitua) e diga o motivo.

| # | Decisão | Status |
|---|---|---|
| [0001](0001-electron-js-puro.md) | Electron com JavaScript puro, sem bundler nem framework | Aceita |
| [0002](0002-nunca-tocar-no-jogo.md) | O app nunca toca no processo do GTA | Aceita |
| [0003](0003-timers-por-tempo-online.md) | Timers contam só tempo de jogo online | Aceita |
| [0004](0004-overlays-janelas-separadas.md) | Overlays são janelas separadas, transparentes e click-through | Aceita |
| [0005](0005-deteccao-digitais-por-captura.md) | Digitais do Casino detectadas por captura de tela e correlação | Aceita |
| [0006](0006-estado-em-json-local.md) | Estado do usuário em um JSON local | Aceita |
| [0007](0007-rede-so-github.md) | Só o processo principal acessa a internet, e só o GitHub | Aceita |
| [0008](0008-instalador-e-atualizacao.md) | Instalador NSIS com atualização automática pelos releases | Aceita |
| [0009](0009-bonus-semanais-no-repositorio.md) | Bônus da semana em um arquivo do repositório | Aceita |
| [0010](0010-tarefas-diarias-e-semanais.md) | Tarefas diárias e semanais com reset do jogo | Aceita |
| [0011](0011-interface-estilo-nexo.md) | Interface no estilo do app Nexo, em pt-BR | Aceita |
| [0012](0012-mapa-do-cayo-offline.md) | Mapa do Cayo Perico com dados offline gerados por script | Aceita |
| [0013](0013-release-notes.md) | Toda versão publicada tem release notes | Aceita |
| [0014](0014-mapa-de-los-santos.md) | Mapa de Los Santos no app, com o que o jogador tem no estado | Aceita |
| [0015](0015-wiki-dos-golpes.md) | Wiki dos golpes com resumos próprios, atualizada pelo GitHub | Aceita |
| [0016](0016-recursos-opcionais.md) | Recursos de colaboradores vêm desligados, com chave em Ajustes | Proposta |

Modelo para uma nova ADR: copie o formato de qualquer arquivo (Status, Data, Contexto, Decisão, Consequências) e use o próximo número.
