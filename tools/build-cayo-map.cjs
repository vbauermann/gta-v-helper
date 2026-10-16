// Builds data/cayo-map.json and app/assets/cayo/ from the cayoperico.online extraction
// (points.json + map/ + icons/ + screenshots/), translating titles and texts to Portuguese.
// Usage: node tools/build-cayo-map.cjs <pasta cayo-map-data>
'use strict';
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('uso: node tools/build-cayo-map.cjs <pasta cayo-map-data>'); process.exit(1); }
const root = path.join(__dirname, '..');
const out = path.join(root, 'app/assets/cayo');
const raw = JSON.parse(fs.readFileSync(path.join(src, 'points.json'), 'utf8'));

const GROUPS = { scoping: 'Reconhecimento', 'treasure-chests': 'Baús do tesouro', unique: 'Pontos únicos', transportation: 'Transporte' };
const CATEGORIES = {
  'secondary-targets': 'Alvos secundários',
  'guard-clothing': 'Roupa de guarda',
  'grappling-equipment': 'Equipamento de escalada',
  'bolt-cutters': 'Alicate corta-cadeado',
  'supply-truck': 'Caminhão de suprimentos',
  'cutting-powder': 'Pó de corte',
  'water-towers': "Caixas d'água",
  'treasure-land': 'Em terra',
  'treasure-sea': 'No mar',
  'infiltration-points': 'Pontos de infiltração',
  'escape-points': 'Pontos de fuga',
  'compound-entry-points': 'Entradas do complexo',
  'combat-shotgun': 'Escopeta de combate',
  'power-station': 'Estação de energia',
  'control-tower': 'Torre de controle',
  bikes: 'Motos',
  boats: 'Barcos'
};
const NOTES = {
  'secondary-targets': 'O que tem em cada sala muda a cada golpe. Os marcados com cadeado só abrem com 2 jogadores.',
  'guard-clothing': 'O jogo coloca 4 destes por golpe. Marque os que achar.',
  'grappling-equipment': 'O jogo coloca 4 destes por golpe.',
  'bolt-cutters': 'O jogo coloca 4 destes por golpe.',
  'supply-truck': 'Só 1 caminhão aparece por golpe.',
  'cutting-powder': 'Usado pra diminuir a atenção dos guardas no complexo.',
  'treasure-land': 'Um baú em terra e um no mar aparecem por dia; a lista diária do site parou em 2022, então todos os possíveis aparecem.',
  'treasure-sea': 'Um baú no mar aparece por dia.'
};
const NAMES = {
  'Water Tower': "Caixa d'água", Airstrip: 'Pista de pouso', 'Main Dock': 'Doca principal', 'North Dock': 'Doca norte',
  'North Drop Zone': 'Zona de salto norte', 'South Drop Zone': 'Zona de salto sul', 'West Beach': 'Praia oeste',
  'Drainage Tunnel': 'Túnel de drenagem', Kosatka: 'Kosatka', 'Main Gate': 'Portão principal', 'North Wall': 'Muro norte',
  'North Gate': 'Portão norte', 'South Wall': 'Muro sul', 'South Gate': 'Portão sul', 'Power Station': 'Estação de energia',
  'Control Tower': 'Torre de controle'
};
const PLACES = {
  after_checkpoint: 'depois do posto de controle', airstrip: 'pista de pouso', airstrip_north: 'norte da pista de pouso',
  boat_central: 'centro da ilha', boat_main_docks: 'doca principal', boats: 'ancoradouro', central: 'centro da ilha',
  checkpoint: 'posto de controle', compound: 'complexo', compound_basement: 'porão do complexo', compound_north: 'complexo, ala norte',
  compound_south: 'complexo, ala sul', compound_west: 'complexo, ala oeste', container: 'contêineres', east: 'leste',
  east_cliff: 'penhasco leste', east_lookout: 'mirante leste', fence: 'cerca', gate: 'portão', hangar_down: 'hangar, térreo',
  hangar_up: 'hangar, andar de cima', jetty: 'píer', lighthouse: 'farol', main_docks: 'doca principal', north: 'norte',
  north_docks: 'doca norte', north_drop_zone: 'zona de salto norte', north_lookout: 'mirante norte',
  north_water_tower: "caixa d'água norte", power_station: 'estação de energia', roof: 'telhado', ruins: 'ruínas', sea: 'mar',
  silo: 'silo', solar_plant: 'usina solar', south_drop_zone: 'zona de salto sul', south_lookout: 'mirante sul',
  south_water_tower: "caixa d'água sul", tower: 'torre', verus: 'Verus', weed_fields: 'plantação de maconha', west_lookout: 'mirante oeste'
};
const DESCRIPTIONS = {
  '* this storage can only be unlocked by 2 players': 'Esta sala só abre com 2 jogadores.',
  'Infiltrate the airstrip using one of the following approach vehicles if acquired:\n- Velum': 'Infiltração pela pista de pouso, com um destes veículos de aproximação (se tiver):\n- Velum',
  'Infiltrate the main dock using one of the following approach vehicles if acquired:\n- Kosatka\n- Patrol Boat\n- Longfin': 'Infiltração pela doca principal, com um destes veículos de aproximação (se tiver):\n- Kosatka\n- Patrol Boat\n- Longfin',
  'Infiltrate the north dock using one of the following approach vehicles if acquired:\n- Kosatka\n- Patrol Boat\n- Longfin': 'Infiltração pela doca norte, com um destes veículos de aproximação (se tiver):\n- Kosatka\n- Patrol Boat\n- Longfin',
  'Infiltrate the north drop zone using one of the following approach vehicles if acquired:\n- Stealth Annihilator': 'Infiltração pela zona de salto norte, com este veículo de aproximação (se tiver):\n- Stealth Annihilator',
  'Infiltrate the south drop zone using one of the following approach vehicles if acquired:\n- Stealth Annihilator': 'Infiltração pela zona de salto sul, com este veículo de aproximação (se tiver):\n- Stealth Annihilator',
  'Infiltrate the west beach using one of the following approach vehicles if acquired:\n- Kosatka\n- Patrol Boat': 'Infiltração pela praia oeste, com um destes veículos de aproximação (se tiver):\n- Kosatka\n- Patrol Boat',
  'Infiltrate the drainage tunnel using one of the following approach vehicles if acquired:\n- Kosatka': 'Infiltração pelo túnel de drenagem, com este veículo de aproximação (se tiver):\n- Kosatka',
  'After acquiring the primary target, find an aircraft at the airstrip to escape from the island.\nThe Control Tower must be disabled before takeoff.\nYou can escape by any other means if plans change during the heist.': 'Depois de pegar o alvo principal, use um avião da pista de pouso pra fugir da ilha.\nA torre de controle precisa estar desativada antes de decolar.\nDá pra fugir de outro jeito se o plano mudar durante o golpe.',
  'After acquiring the primary target, find a boat at the main dock to escape from the island.\nYou can escape by any other means if plans change during the heist.': 'Depois de pegar o alvo principal, use um barco da doca principal pra fugir da ilha.\nDá pra fugir de outro jeito se o plano mudar durante o golpe.',
  'After acquiring the primary target, find a boat at the north dock to escape from the island.\nYou can escape by any other means if plans change during the heist.': 'Depois de pegar o alvo principal, use um barco da doca norte pra fugir da ilha.\nDá pra fugir de outro jeito se o plano mudar durante o golpe.',
  'After acquiring the primary target, get back to your Kosatka to escape from the island.\nYou can escape by any other means if plans change during the heist.\nPlease note:\nTo escape with your Kosatka, it must also be used as your approach vehicle.': 'Depois de pegar o alvo principal, volte pro Kosatka pra fugir da ilha.\nDá pra fugir de outro jeito se o plano mudar durante o golpe.\nAtenção: pra fugir de Kosatka, ele também precisa ter sido o veículo de aproximação.',
  "Enter the courtyard of El Rubio's compound by destroying the main gate or stay undetected under the cover of a disguise.": 'Entre no pátio do complexo do El Rubio destruindo o portão principal, ou sem ser visto usando disfarce.',
  "Enter El Rubio's compound undetected by climbing the broken wall.\nPlease note:\nThis entry point cannot be selected at the start of the heist. It can only be used if grappling equipment is acquired during the job.": 'Entre no complexo sem ser visto escalando o muro quebrado.\nAtenção: não dá pra escolher esta entrada no início do golpe. Só funciona se você pegar o equipamento de escalada durante o golpe.',
  "Enter El Rubio's compound undetected by unlocking the side gate.\nPlease note:\nThis entry point cannot be selected at the start of the heist. It can only be used if the code to the gate is acquired from a guard during the job.": 'Entre no complexo sem ser visto abrindo o portão lateral.\nAtenção: não dá pra escolher esta entrada no início do golpe. Só funciona se você pegar o código do portão com um guarda durante o golpe.',
  "Enter El Rubio's compound undetected through the underwater drainage tunnel.": 'Entre no complexo sem ser visto pelo túnel de drenagem submerso.',
  "Disables security cameras and all lights on the island to reduce the guards' range of sight at night.": 'Desliga as câmeras e todas as luzes da ilha, reduzindo o alcance de visão dos guardas à noite.',
  'Disables air defenses around the island and allows hired support crew to be called in via the Interaction Menu.': 'Desativa a defesa aérea da ilha e libera chamar a equipe de apoio contratada pelo Menu de Interação.'
};

function need(dict, key, what) {
  if (!(key in dict)) throw new Error(`Sem tradução para ${what}: ${JSON.stringify(key)}`);
  return dict[key];
}
const asset = p => `assets/cayo/${p}`;
const used = new Set();
const use = p => { used.add(p); return asset(p); };

const groups = raw.groups.map(g => ({
  id: g.id,
  title: need(GROUPS, g.id, 'grupo'),
  defaultVisible: g.defaultVisible,
  categories: g.categories.map(c => ({
    id: c.id,
    title: need(CATEGORIES, c.id, 'categoria'),
    icon: use(c.icon),
    ...(c.foundIcon ? { foundIcon: use(c.foundIcon) } : {}),
    ...(c.lookingFor ? { lookingFor: c.lookingFor } : {}),
    ...(c.trackFound ? { trackFound: true } : {}),
    ...(c.canHide ? { canHide: true } : {}),
    ...(NOTES[c.id] ? { note: NOTES[c.id] } : {})
  }))
}));

const points = raw.points.map(p => {
  const key = p.imageKey.replace(/^.*\//, '').replace(/_\d+$/, '');
  const place = p.name ? null : /^\d+$/.test(key) ? null : need(PLACES, key, 'local');
  return {
    id: p.id,
    category: p.category,
    ...(p.name ? { name: need(NAMES, p.name, 'nome') } : {}),
    ...(place ? { place } : {}),
    x: p.x,
    y: p.y,
    icon: use(p.icon),
    ...(p.icon.includes('locked') ? { locked: true } : {}),
    screenshot: use(p.screenshot),
    ...(p.description ? { description: need(DESCRIPTIONS, p.description, 'descrição') } : {})
  };
});

const maps = [{ src: 'map/cayo-map-4096.jpg', size: 4096 }, { src: 'map/cayo-map-8192.jpg', size: 8192 }];
for (const m of maps) used.add(m.src);

fs.rmSync(out, { recursive: true, force: true });
for (const rel of used) {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.copyFileSync(path.join(src, rel), path.join(out, rel));
}
const data = {
  source: 'cayoperico.online',
  images: maps.map(m => ({ src: asset(m.src), size: m.size })),
  groups,
  points
};
fs.writeFileSync(path.join(root, 'data/cayo-map.json'), JSON.stringify(data, null, 1) + '\n');
console.log(`${points.length} pontos, ${groups.length} grupos, ${used.size} arquivos copiados`);
