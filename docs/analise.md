# GTA Online Helper: análise e plano

> Status: análise inicial (2026-10-16), mantida como histórico. O que foi decidido e implementado está em [docs/adr](adr/README.md) e no [CLAUDE.md](../CLAUDE.md).
> Plataforma assumida: Windows PC (GTA V Legacy ou Enhanced).

## 1. Faz sentido?

Faz, e quase tudo é viável sem risco. A regra que guia o projeto é simples:
**o app nunca lê nem escreve na memória do jogo, nunca injeta nada no processo e nunca envia teclas para o jogo.**
Tudo vem de input manual seu, de dados públicos ou (opcionalmente) da imagem da tela.

| Ideia | Viável? | Risco com o anti-cheat (BattlEye) | Observação |
|---|---|---|---|
| Cadastro de negócios e upgrades | Sim | Nenhum | Input manual, não existe API oficial de dados do jogador |
| Timer de ressuprimento | Sim | Nenhum | Precisa pausar quando você não está no jogo (ver seção 3) |
| Tabela de payouts e calculadora de golpes | Sim | Nenhum | Dados estáticos e editáveis |
| Mapa de alvos secundários de Cayo | Sim | Nenhum | Mapa interativo onde você marca o que achou no scout |
| Overlay do fingerprint (guia visual) | Sim | Nenhum | Janela transparente por cima do jogo |
| Fingerprint com reconhecimento automático da tela | Sim | Baixo, mas não zero | Só captura de tela, igual OBS; ver seção 4 |
| Resolver o hack sozinho (enviar teclas) | Tecnicamente sim | **Alto** | Isso é automação e viola os termos; recomendo não fazer |
| Bônus e descontos semanais | Sim | Nenhum | Rockstar Newswire, sem API oficial |

## 2. Overlay: como funciona com o GTA

- **Tela cheia exclusiva não funciona.** Em fullscreen exclusivo, qualquer janela "always on top" faz o jogo minimizar ou piscar. O GTA precisa estar em **Janela sem bordas (Borderless Windowed)**. No GTA Enhanced (DX12) o modo tela cheia já se comporta quase como borderless, mas o mais seguro é escolher borderless explicitamente.
- O overlay é uma **janela separada, transparente, sempre no topo e "click-through"** (os cliques passam para o jogo). Um atalho global (ex.: `Ctrl+Shift+O`) alterna entre "modo jogo" (click-through) e "modo interação" (você clica no overlay).
- **Não usamos hook de DirectX** (o jeito que Discord e Steam desenham dentro do jogo). Injetar no processo é exatamente o que o BattlEye vigia. Janela externa por cima não toca no jogo.
- Atalhos globais do Windows (`RegisterHotKey`) funcionam com o jogo em foco e não interagem com o processo do GTA.
- Custo: borderless pode custar alguns FPS em relação a fullscreen exclusivo, nada dramático em PC atual.

## 3. Timer de ressuprimento: o detalhe que muda tudo

1. **Os negócios só produzem enquanto você está numa sessão online.** Fechou o jogo, a produção e o consumo de suprimentos param. Um timer de relógio comum ("acaba às 22h") daria valor errado.
   - Solução: o app detecta se o processo `GTA5.exe` / `GTA5_Enhanced.exe` está rodando (só lista processos, não abre o processo) e **pausa o timer quando o jogo fecha**. Fica um botão "estou no modo história / menu" para pausar na mão, já que estar com o jogo aberto não garante estar online.
2. **A velocidade depende dos upgrades.** Equipamento e Funcionários aumentam a velocidade de produção, então os suprimentos acabam **mais rápido** com upgrades (o mesmo suprimento rende mais produto). O modelo por negócio:
   - `minutos_por_unidade[equipamento][funcionarios]`
   - `suprimento_consumido_por_unidade`
   - `estoque_max` (com upgrade de segurança/expansão quando houver)
   - Timer de "suprimento acaba em X" e também de "estoque cheio em Y", que é útil para não perder produção.
3. **Fonte dos números:** as páginas de cada negócio na GTA Wiki (Fandom) listam os tempos por combinação de upgrade. Vou montar uma tabela JSON versionada com a fonte de cada valor. Como a Rockstar mexe nesses números em updates, o app terá **calibração**: você marca "suprimento acabou agora" e ele ajusta a taxa pelo tempo real medido.
4. Negócios cobertos: Cocaína, Metanfetamina, Dinheiro Falso, Maconha, Documentos, Bunker, Acid Lab, mais as fontes passivas (Nightclub, Agency, Arcade, Salvage Yard, cofres) como extras.
5. Notificação: toast do Windows. Opcional depois: push no celular (ntfy ou Telegram) para avisar que o estoque encheu enquanto você está AFK.

## 4. Fingerprint do Casino

O hack de digital do Casino tem 4 digitais possíveis (as que você mandou, com os apelidos S, O, J e L da comunidade). Cada uma tem 8 peças na lista e 4 são as corretas.

**Fase A, overlay de referência (sem captura de tela, risco zero):**
- O overlay mostra as 4 digitais com as peças corretas destacadas. Você bate o olho na digital grande, aperta `1` a `4` (ou passa com um atalho) e o overlay mostra quais posições marcar.
- Já resolve a maior parte da dor e dá para fazer na primeira versão.

**Fase B, reconhecimento automático:**
- Captura só a região do hack com Windows Graphics Capture (a mesma API que OBS e a Ferramenta de Captura usam), compara com as 4 referências por template matching e destaca as peças corretas sozinho. Mesmo esquema serve para o hack de keypad (Casino) e o de digital de Cayo, que funciona diferente.
- Risco: não toca no processo, e tecnicamente é igual a gravar a tela. Ainda assim, os termos da Rockstar falam em "software de terceiros não autorizado" de forma ampla, então é zona cinzenta. O que garante que não vira cheat é **nunca enviar inputs**: o app só mostra, você joga.
- Funciona com qualquer resolução ou proporção desde que as referências sejam normalizadas. Vale testar no seu monitor.

## 5. Helpers de golpe

### Cayo Perico
- **Mapa interativo** com todos os pontos possíveis de alvos secundários (os `?` da sua imagem), separado por área (aeroporto, cais norte, docas principais, complexo). No scout você clica no ponto e escolhe o que tinha lá (ouro, cocaína, maconha, pinturas, dinheiro). Isso pode ficar como overlay pequeno no canto.
- **Otimizador de bolsa:** com tamanho do grupo e alvos encontrados, calcula a combinação que dá mais dinheiro (ouro primeiro, depois pinturas/cocaína etc., considerando quanto cada pilha ocupa da bolsa e que ouro só sai com 2 pessoas no complexo). É uma das coisas mais úteis do app.
- **Calculadora de payout:** alvo principal (base da sua imagem: Tequila $400k, Colar de Rubi $560k, Títulos ao Portador $616k, Diamante Rosa $910k), modo difícil (+10%), taxas fixas (Pavel 2% e taxa de fence 10%), Elite Challenge, e divisão do grupo.
- **Cooldown:** timer depois de terminar (o cooldown é mais longo solo do que em grupo).

### Diamond Casino
- **Calculadora:** alvo (Cash $1.48M, Arte $1.645M, Ouro $1.8095M, Diamantes $2.303M base, conforme sua imagem), multiplicador de primeira conclusão semanal (1.86x), corte do Lester, corte do comprador (depende do nível), cortes de atirador, motorista e hacker, e divisão do grupo.
- **Checklist de preps** por abordagem (Silent & Sneaky, Big Con, Aggressive), opcionais que valem a pena e quais pular.
- Overlay do fingerprint e do keypad (seção 4).

### Planilha geral de golpes
- A tabela da sua imagem vira dados editáveis: base atual, multiplicador semanal e primeira conclusão semanal, com a data da última atualização e a fonte.
- Extra: registro de ganhos ("fiz Cayo agora, ganhei X") para ter ganho por hora e por golpe ao longo do tempo.

Observação: alguns valores da imagem (pós-atualização de economia) diferem bastante do que circula em guias antigos, inclusive os valores de alvos secundários de Cayo. Cada valor no app vai ter fonte e data, para ficar fácil atualizar.

## 6. Atualizações semanais

- A semana de eventos vira toda **quinta-feira**, e a fonte oficial é o **Rockstar Newswire** (rockstargames.com/newswire). Não existe API pública. O site carrega o conteúdo por uma API interna que dá para consultar, mas pode mudar sem aviso.
- Fontes da comunidade para confirmar e preencher lacunas: o post semanal do Tez2 no r/gtaonline (muito completo, inclui coisas que a Rockstar não anuncia) e o GTAForums.
- Proposta: um coletor que busca o Newswire na quinta, extrai bônus (2x, 3x, 4x) e descontos para um formato estruturado e mostra no app. Se o parser falhar, dá para colar o texto e o app organiza. Tudo cacheado localmente.
- Integração útil: se a semana tem "2x em Cocaína", o card do negócio mostra o selo do bônus.

## 7. Sugestões além do que você pediu

1. **Painel "o que fazer agora"**: juntando tudo, mostra estoque quase cheio, cooldown de Cayo liberado e bônus da semana em negócio que você tem.
2. **Dailies e coletáveis** (G's Cache, Stash House, naufrágio etc.) como checklist que reseta sozinho.
3. **Atalhos rápidos**: um atalho para "ressupri cocaína" sem sair do jogo.
4. **Backup e sincronização** do seu cadastro (arquivo JSON exportável, opcional na nuvem depois).
5. **Modo grupo** (futuro): compartilhar com amigos um plano de Cayo e o mapa de scout em tempo real.

## 8. Como construir

### Stack recomendada: Tauri 2 + React/TypeScript + SQLite
- **Tauri 2**: app desktop com interface web e backend em Rust. Instalador de poucos MB e baixo uso de memória (importante rodando junto do GTA). Suporta várias janelas transparentes, always-on-top e click-through (`set_ignore_cursor_events`), bandeja do sistema, atalhos globais e notificações nativas.
- **React + TypeScript** na interface: fácil de fazer tabela, mapa e calculadora.
- **SQLite** local para negócios, timers e histórico de ganhos.
- **Rust** para o que é de sistema: detecção do processo, captura de tela (crate `windows-capture`) e template matching (`imageproc` ou OpenCV) na Fase B do fingerprint.
- Mapa: Leaflet com imagem própria e coordenadas em JSON.

Alternativas: **Electron** (tudo em JS, mais simples se você não quer Rust, mas pesa uns 150+ MB de RAM) ou **C#/WPF** (nativo de Windows, ótimo para overlay e captura, interface mais trabalhosa). Se você já tem afinidade com alguma, isso pesa mais que a diferença técnica.

### Arquitetura

```
┌───────────────────── App principal (janela normal) ─────────────────────┐
│ Negócios │ Timers │ Golpes (Cayo/Casino) │ Semana │ Ganhos │ Config      │
└──────────────────────────────────────────────────────────────────────────┘
┌──────── Overlays (janelas transparentes, click-through, sempre no topo) ──┐
│ Fingerprint │ Mapa de scout Cayo │ Mini-timers │ (liga/desliga via atalho)│
└──────────────────────────────────────────────────────────────────────────┘
                 │ eventos (Tauri IPC)
┌──────────────── Backend Rust ─────────────────────────────────────────────┐
│ Motor de timers (pausa se o jogo fechar) │ Detector de processo GTA       │
│ Agendador de notificações │ Coletor do Newswire │ Captura + matching (B)   │
│ SQLite (dados do usuário) │ JSON versionado (dados do jogo, com fonte)     │
└──────────────────────────────────────────────────────────────────────────┘
```

Separar **dados do jogo** (payouts, tempos de produção, pontos do mapa: JSON com fonte e data, atualizável sem novo release) dos **seus dados** (SQLite) é o que mantém o app útil depois de cada update da Rockstar.

### Fases sugeridas
1. **MVP**: cadastro de negócios e upgrades, timers com pausa automática e notificação, tabela de payouts e calculadoras de Cayo e Casino.
2. **Overlays**: overlay do fingerprint (referência), mapa de scout de Cayo com otimizador de bolsa, mini-timers.
3. **Semana**: coletor do Newswire e selos de bônus nos negócios.
4. **Visão computacional**: fingerprint e keypad automáticos via captura de tela.
5. **Extras**: registro de ganhos, dailies, painel "o que fazer agora", modo grupo.

## 9. Pontos em aberto
- Qual stack você prefere (Tauri recomendado, ou Electron ou C# se for mais confortável).
- Se quer só para você ou pensa em distribuir (muda cuidado com assets da Rockstar, como o mapa: para distribuição, desenhar um mapa próprio).
- Por onde começar (pergunta no thread).
