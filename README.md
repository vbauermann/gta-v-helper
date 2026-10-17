# GTA Helper

App desktop (Electron) de apoio ao GTA Online: timers de ressuprimento dos negócios e calculadoras de golpes. Fase 1 do plano em [docs/analise.md](docs/analise.md).

O app nunca lê nem escreve na memória do jogo, não injeta nada e não envia teclas. Para saber se o GTA está aberto ele só consulta a lista de processos do Windows (`tasklist`).

## Instalar

Baixe o `GTA-Helper-Setup-x.y.z.exe` da última versão em [Releases](https://github.com/vbauermann/gta-v-helper/releases/latest) e execute. Como o instalador não tem assinatura digital, o Windows pode mostrar "O Windows protegeu o computador": clique em **Mais informações** e depois em **Executar assim mesmo**.

Depois de instalado, o app procura versões novas sozinho e avisa quando uma estiver pronta. Os bônus da semana vêm de [data/weekly.json](data/weekly.json) neste repositório, então chegam sem precisar de versão nova. Fora isso, o app só acessa o GitHub; as telas não têm acesso à internet.

## O que tem

- **Negócios:** marque o que você tem e os upgrades (Cocaína, Meth, Dinheiro, Maconha, Documentos, Bunker, Acid Lab). Ao ressuprir ou vender no jogo, aperte o botão correspondente.
- **Timers:** contam só tempo de jogo online, porque os negócios só produzem com você numa sessão. Por padrão o timer roda apenas com `GTA5.exe` ou `GTA5_Enhanced.exe` aberto, e tem um botão de pausa para quando você estiver no modo história ou no menu. A produção para quando o suprimento acaba ou o estoque enche, igual ao jogo.
- **Notificações do Windows** quando o suprimento está acabando (10 min de jogo antes, configurável), quando acaba e quando o estoque enche.
- **Calibração:** os tempos de consumo são estimados. Se medir no jogo quanto uma barra cheia dura, informe em "Ajustar e calibrar" no card do negócio.
- **Cayo Perico:** mapa do scout clicável (o complexo aparece ampliado ao lado) onde você marca o que tinha em cada ponto, plano de bolsas a partir dos secundários encontrados no scout (ouro só com 2+ jogadores, pintura não se divide), pagamento líquido com Pavel e fence (12%), modo difícil, Elite Challenge, cortes por jogador e timer de cooldown (144 min solo, 48 min em grupo).
- **Mapa de Los Santos:** negócios, propriedades, garagens (nome no hover, para o fast travel), agência, bail office e animais da fotografia. Marque o que você tem e use "Só os meus" para ver o seu mapa.
- **Diamond Casino:** pagamento com Lester, comprador, atirador, motorista, hacker, multiplicador da primeira conclusão semanal e cortes.
- **Tabela de payouts** da atualização de economia.
- Ícone na bandeja: fechar a janela mantém o app rodando para os timers continuarem.

## Para quem vai contribuir

- [CLAUDE.md](CLAUDE.md): regras do projeto, mapa do código e comandos (lido automaticamente pelo Claude Code).
- [docs/adr](docs/adr/README.md): decisões de arquitetura e por quê.
- [.claude/skills](.claude/skills): skills do projeto (desenvolver, publicar versão, atualizar a semana, digitais do Casino).

## Rodar

```bash
npm install
npm start
```

## Testes

```bash
npm test          # regras de produção, timers, cálculos de golpes, persistência
npm run capture   # abre o app com dados de exemplo e salva prints das páginas em captures/
```

## Gerar o executável

```bash
npm run package   # gera dist/GTA Helper/GTA Helper.exe (pasta portátil, roda de Windows ou Linux)
```

O script baixa o runtime do Electron para Windows na mesma versão do `package.json` e grava ícone e nome no .exe. O .exe não é assinado, então o SmartScreen pode pedir "Mais informações > Executar assim mesmo" na primeira vez.

## Estrutura

| Arquivo | Papel |
|---|---|
| `main.cjs` | Processo principal: janela, bandeja, IPC, tick dos timers, notificações |
| `preload.cjs` | API `window.gta` exposta à interface (contextIsolation + sandbox) |
| `store.cjs` | Persistência em JSON na pasta de dados do usuário (`%APPDATA%/GTA Helper/gta-helper.json`) |
| `timers.cjs` | Avança a produção e decide os alertas |
| `game-watcher.cjs` | Detecta o GTA pela lista de processos |
| `lib/production.js` | Modelo de produção e consumo (usado no main e na interface) |
| `lib/heists.js` | Cálculos de Cayo e Casino |
| `data/*.json` | Dados do jogo com fontes. Edite aqui quando a Rockstar mudar valores |
| `app/` | Interface (HTML/CSS/JS puro, sem bundler) |

## Dados e fontes

- Tempos por unidade, capacidade e valores dos negócios: [gtamaxprofit.com](https://gtamaxprofit.com/more/profit-tables/) e [gtaboss.gg](https://www.gtaboss.gg/gta-5-online/businesses/acid-lab) (Acid Lab).
- Duração da barra de suprimentos: estimada a partir de [drifted.com](https://www.drifted.com/gta-online-bunker-guide/) (Bunker 1h40 sem upgrades, 2h20 com tudo) e de [gtaboss.gg](https://www.gtaboss.gg/gta-5-online/guides/everything-you-need-to-know-about-the-cocaine-lockup-in-gta-v-online) (2,5 barras para encher a Cocaína). Precisa ser confirmada no jogo.
- Cayo Perico pós Title Update 1.73: [gtaboom.com](https://www.gtaboom.com/cayo-perico-heist-payout-list-cooldowns-bonus-payouts-and-all-targets-035d) e [timesaver.gg](https://timesaver.gg/blog/gta-online-cayo-perico-loot-values-2026).
- Mapa de Los Santos (posições, nomes e imagem): [gtaweb.eu](https://gtaweb.eu/gtao-map/ls).
- Golpes: tabela GTASeriesVideos da atualização de economia.

## Publicar uma versão

1. Suba `version` em `package.json` e envie para a `main`.
2. O workflow [Release](.github/workflows/release.yml) roda os testes no Windows, gera o instalador e publica o release `vX.Y.Z`. Os apps instalados atualizam a partir dele. Versões que já têm release são ignoradas; dá pra rodar o workflow na mão pela aba Actions.

Bônus da semana novos: basta editar `data/weekly.json` na `main`. Os apps buscam o arquivo ao abrir e a cada 3 horas.
