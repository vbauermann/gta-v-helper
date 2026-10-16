---
name: gta-weekly-update
description: Atualizar os bônus da semana do GTA Online (data/weekly.json) toda quinta. Use quando sair o update semanal da Rockstar ou pedirem os bônus novos.
---

# Atualizando a semana

Contexto em [ADR 0009](../../../docs/adr/0009-bonus-semanais-no-repositorio.md). O arquivo `data/weekly.json` na `main` é baixado por todos os apps instalados (a cada 3 h e ao abrir), então o push já entrega a semana nova.

## Fontes

Rockstar Newswire (`rockstargames.com/newswire`), GTA Boss (`gtaboss.gg`) e resumos como Power Up Gaming. Cruze pelo menos duas. Não invente valor: se não achar um preço, omita o campo.

## Formato

```jsonc
{
  "start": "2026-10-22", "end": "2026-10-28",       // quinta a quarta (datas sem hora)
  "resetUtc": "2026-10-29T10:00:00Z",               // próxima virada da semana, em UTC
  "theme": "Halloween",                              // opcional
  "sources": [{ "name": "Rockstar Newswire", "url": "https://..." }],
  "bonuses": [{ "mult": "3x", "items": [{ "name": "...", "note": "opcional" }] }],   // do maior para o menor
  "rewards": [{ "name": "GTA$ 500.000", "note": "como ganhar" }],
  "rotations": [{ "label": "FIB Priority File", "value": "..." }],   // mantenha estes labels: "FIB Priority File", "Kortz Center Heist (alvos)", "Salvage Yard (roubos)"
  "discounts": [{ "pct": 40, "items": [{ "name": "...", "price": 1499000, "sale": 899400 }] }],  // do maior para o menor
  "vehicles": {
    "podium": { "name": "...", "price": 0, "note": "..." },
    "prize": { "name": "...", "note": "..." },
    "testRides": [{ "name": "...", "price": 0, "note": "..." }],
    "showroom": [{ "name": "...", "price": 0, "note": "..." }]
  },
  "gunVan": [{ "name": "...", "note": "30% off" }],
  "gtaPlus": { "until": "2026-11-04", "items": ["..."] },             // opcional
  "todo": {                                                            // opcional
    "boosts": { "dre": "texto do bônus" },        // chaves de lib/todos.js (SUGGESTIONS.key)
    "extra": [{ "key": "wk-xxx", "title": "...", "note": "..." }]       // tarefas que só valem nesta semana
  }
}
```

Nomes de itens ficam como no jogo (inglês); notas em português. Valores em GTA$ como número inteiro.

## Passos

1. Monte o arquivo novo com a semana atual (não acumule semanas).
2. Valide: `node --test test/weekly-feed.test.cjs` (o teste confere o formato que o app aceita).
3. Confira a tela: `npm run capture` e abra `captures/weekly.png` e `captures/todos.png`.
4. Commit e push para a `main`. Não precisa subir versão.

## Regras do formato

- `start` precisa ser igual ou posterior ao da semana publicada, senão os apps ignoram o arquivo.
- Campos obrigatórios não podem sumir nem mudar de tipo (versões antigas deixariam de aceitar). Campo novo entra como opcional.
