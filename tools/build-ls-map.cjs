// Builds data/ls-map.json (Los Santos map: properties, businesses, garages, animals) from the
// gtaweb.eu GTA Online map extraction: config.json (its MapConfig answer) and txt.json (its English
// texts). Positions are game coordinates converted to 0..1 of the map image: the "game" tile layer
// (16384x24576 covering x -4140..4860, y 8400..-5100) cropped to the island, pixels 256..3912 x
// 200..5584 at 4096 wide (ls-map.jpg; ls-map-hd.jpg is the same crop at twice the size). Icons are the 32 px blips cropped from its
// dots_centered.webp sprite into app/assets/ls/icons/.
// Usage: node tools/build-ls-map.cjs <pasta com config.json e txt.json>
'use strict';
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('uso: node tools/build-ls-map.cjs <pasta com config.json e txt.json>'); process.exit(1); }
const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(src, 'config.json'), 'utf8'));
const txt = JSON.parse(fs.readFileSync(path.join(src, 'txt.json'), 'utf8')).map_popups;
const C = config[8]; // COORDS
const BOUNDS = { left: -4140 + 256 / 4096 * 9000, top: 8400 - 200 / 6144 * 13500, width: 3656 / 4096 * 9000, height: 5384 / 6144 * 13500 };
const round = n => Math.round(n * 1e5) / 1e5;
const xy = ([gx, gy]) => ({ x: round((gx - BOUNDS.left) / BOUNDS.width), y: round((BOUNDS.top - gy) / BOUNDS.height) });
const ico = n => `assets/ls/icons/${n}.png`;
const decode = s => String(s).replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const points = [];
const add = (category, id, coords, extra) => points.push({ id: `${category}-${id}`, category, ...xy(coords), ...extra });
const list = (category, coords, names, extra = () => ({})) => coords.forEach((c, i) => add(category, i + 1, c, { name: decode(names[i]), ...extra(i) }));
const numbered = obj => Object.keys(obj).sort((a, b) => a - b).map(k => obj[k]);

// MC business order in gtaweb's lists, checked against the game's locations.
const MC = {
  cocaine: { key: 'coke', icon: 'coke', title: 'Cocaína', places: ['Paleto Bay', 'Morningwood', 'Alamo Sea', 'Elysian Island'] },
  meth: { key: 'meth', icon: 'meth', title: 'Metanfetamina', places: ['Paleto Bay', 'El Burro Heights', 'Grand Senora Desert', 'Terminal'] },
  cash: { key: 'cash', icon: 'cash', title: 'Dinheiro falso', places: ['Paleto Bay', 'Vespucci Canals', 'Grand Senora Desert', 'Cypress Flats'] },
  weed: { key: 'weed', icon: 'weed', title: 'Maconha', places: ['Paleto Bay', 'Downtown Vinewood', 'San Chianski', 'Elysian Island'] },
  documents: { key: 'docs', icon: 'docs', title: 'Documentos falsos', places: ['Paleto Bay', 'Textile City', 'Grapeseed', 'Elysian Island'] }
};

const groups = [
  {
    id: 'businesses', title: 'Negócios', defaultVisible: true,
    categories: [
      ...Object.entries(MC).map(([biz, m]) => ({ id: `mc-${biz}`, title: m.title, icon: ico(m.icon), owns: 1, business: biz })),
      { id: 'bunker', title: 'Bunker', icon: ico('bunk'), owns: 1, business: 'bunker' },
      { id: 'warehouse', title: 'Warehouse de cargo (CEO)', icon: ico('warehouse'), owns: 5, note: 'Marcar aqui coloca a warehouse no card Special Cargo dos Negócios.' },
      { id: 'vehicle-warehouse', title: 'Vehicle Warehouse', icon: ico('vehicle_warehouse'), owns: 1, note: 'Import/Export. Marcar aqui coloca a warehouse nos Negócios.' }
    ]
  },
  {
    id: 'properties', title: 'Propriedades', defaultVisible: true,
    categories: [
      { id: 'office', title: 'Escritório (CEO)', icon: ico('office'), owns: 1 },
      { id: 'clubhouse', title: 'Clubhouse (MC)', icon: ico('mc1'), owns: 1 },
      { id: 'agency', title: 'Agência', icon: ico('agency'), owns: 1 },
      { id: 'bail-office', title: 'Bail Office', icon: ico('bail_offices'), owns: 1 },
      { id: 'nightclub', title: 'Nightclub', icon: ico('nc'), owns: 1, business: 'nightclub' },
      { id: 'arcade', title: 'Fliperama', icon: ico('arcade'), owns: 1 },
      { id: 'auto-shop', title: 'Auto Shop', icon: ico('autoshop'), owns: 1 },
      { id: 'salvage-yard', title: 'Ferro-velho (Salvage Yard)', icon: ico('salvage_yard'), owns: 1 },
      { id: 'hangar', title: 'Hangar', icon: ico('hangar'), owns: 1 },
      { id: 'facility', title: 'Instalação (Facility)', icon: ico('facility'), owns: 1 },
      { id: 'apartment', title: 'Apartamentos e casas', icon: ico('home2'), owns: 0 },
      { id: 'penthouse', title: 'Cobertura do Cassino', icon: ico('home8'), owns: 1 },
      { id: 'mansion', title: 'Mansão', icon: ico('home5'), owns: 3 }
    ]
  },
  {
    id: 'garages', title: 'Garagens', defaultVisible: true,
    categories: [{ id: 'garage', title: 'Garagens', icon: ico('garage'), owns: 0, note: 'Passe o mouse pra ver o nome que aparece no fast travel.' }]
  }
];

// Businesses
for (const [biz, m] of Object.entries(MC)) list(`mc-${biz}`, C.mc_businesses[m.key], m.places);
list('bunker', C.bunkers, numbered(txt.bunker));
// Warehouses: names, sizes and game coordinates gathered from the same gtaweb.eu data (warehouses.json).
const wh = JSON.parse(fs.readFileSync(path.join(src, 'warehouses.json'), 'utf8'));
wh.special_cargo_warehouses.forEach(w => add('warehouse', w.index, w.game, { name: w.name, size: w.size }));
wh.vehicle_warehouses.forEach(w => add('vehicle-warehouse', w.index, w.game, { name: w.name }));

// Properties
list('office', C.offices, txt.offices);
list('clubhouse', C.mc_clubhouses, numbered(txt.mc_clubhouses));
list('agency', C.agencies, numbered(txt.agencies));
list('bail-office', C.bail_offices, numbered(txt.bail_offices));
list('nightclub', C.nightclubs, numbered(txt.nightclubs));
list('arcade', C.arcades, numbered(txt.arcades));
list('auto-shop', C.autoshops, numbered(txt.autoshops));
list('salvage-yard', C.salvage_yards, numbered(txt.salvage_yards));
list('hangar', C.hangars, numbered(txt.hangars));
list('facility', C.facilities, numbered(txt.facilities));
let apt = 0;
for (const size of ['10', '6', '2']) {
  C.apartments[size].forEach((c, i) => add('apartment', ++apt, c, { name: decode(txt.apartments_names[size][i]), place: `Garagem de ${size} vagas` }));
}
add('penthouse', 1, C.apartments.cph[0], { name: 'The Diamond Casino & Resort', place: 'Cobertura' });
list('mansion', C.o_mansions, numbered(txt.mansions));

// Garages: the name is what the fast travel / property menu shows.
let gar = 0;
for (const size of ['50', '10', '6', '2']) {
  C.garages[size].forEach((c, i) => add('garage', ++gar, c, { name: decode(txt.garages_names[size][i]), place: `${size} vagas` }));
}

// Wildlife photography: spawn spots per species and in-game time window. The game has thousands
// for common species, so keep one spot per ~120 m cell and at most 120 per species.
const ANIMALS = {
  boar: ['Javali', 'animal_boar'], cat: ['Gato', 'animal_cat'], chickenhawk: ['Gavião', 'animal_chickenhawk'],
  cormorant: ['Cormorão', 'animal_cormorant'], cow: ['Vaca', 'animal_cow'], coyote: ['Coiote', 'animal_coyote'],
  crow: ['Corvo', 'animal_crow'], deer: ['Cervo', 'animal_deer'], dog_husky: ['Husky', 'animal_dog_husky'],
  dog_husky_retriever: ['Husky / Golden Retriever', 'animal_dog_retriever'], dog_pug: ['Pug', 'animal_dog_pug'],
  dog_rottweiler: ['Rottweiler', 'animal_dog_rottweiler'], dog_shepherd: ['Border Collie', 'animal_dog_shepherd'],
  dog_small: ['Poodle', 'animal_dog_small'], dog_westy: ['West Highland Terrier', 'animal_dog_westy'],
  dolphin: ['Golfinho', 'animal_dolphin'], fish: ['Peixe', 'animal_fish'], gull: ['Gaivota', 'animal_gull'],
  hen: ['Galinha', 'animal_hen'], mountain_lion: ['Puma', 'animal_mountain_lion'], orca: ['Orca', 'animal_orca'],
  pig: ['Porco', 'animal_pig'], pigeon: ['Pombo', 'animal_pigeon'], rabbit: ['Coelho', 'animal_rabbit'],
  rat: ['Rato', 'animal_rat'], shark: ['Tubarão', 'animal_shark'], shark_hammerhead: ['Tubarão-martelo', 'animal_shark_hammerhead'],
  shark_tiger: ['Tubarão-tigre', 'animal_shark_tiger'], stingray: ['Arraia', 'animal_stingray'], whale: ['Baleia-jubarte', 'animal_whale']
};
const CELL = 120, MAX_PER_SPECIES = 120;
const animalCats = [{ id: 'tourist-board', title: 'LS Tourist Board', icon: ico('lstb'), owns: 0, note: 'Onde fica o quadro com a lista dos animais do dia.' }];
add('tourist-board', 1, C.shoot_animals_photography[0], { name: 'LS Tourist Board', place: 'Lista de animais pra fotografar' });
for (const [species, [title, icon]] of Object.entries(ANIMALS).sort((a, b) => a[1][0].localeCompare(b[1][0], 'pt-BR'))) {
  const windows = C.animals[species];
  if (!windows) throw new Error(`sem dados de ${species}`);
  const seen = new Set();
  let spots = [];
  // Whole-day spots first, so they win the cell.
  const keys = Object.keys(windows).sort((a, b) => (isAllDay(b) - isAllDay(a)) || a.localeCompare(b));
  for (const key of keys) {
    for (const c of windows[key]) {
      const cell = `${Math.round(c[0] / CELL)},${Math.round(c[1] / CELL)}`;
      if (seen.has(cell)) continue;
      seen.add(cell);
      spots.push({ c, time: isAllDay(key) ? null : key.replace(/^(\d\d)-(\d\d)$/, '$1:00 às $2:00').replace('24:00', '00:00') });
    }
  }
  if (spots.length > MAX_PER_SPECIES) {
    const step = spots.length / MAX_PER_SPECIES;
    spots = Array.from({ length: MAX_PER_SPECIES }, (_, i) => spots[Math.floor(i * step)]);
  }
  const id = `animal-${species.replace(/_/g, '-')}`;
  animalCats.push({ id, title, icon: ico(icon), owns: 0 });
  spots.forEach((s, i) => add(id, i + 1, s.c, { place: s.time ? `Aparece das ${s.time} (hora do jogo)` : 'Aparece o dia todo' }));
}
function isAllDay(key) { return key.startsWith('00-24') || key === '00-00'; }
groups.push({
  id: 'animals', title: 'Animais (fotografia)', defaultVisible: false,
  note: 'Ligue só os animais da sua lista do dia. Cada ponto é um lugar onde o animal pode aparecer.',
  categories: animalCats
});

const out = {
  source: 'gtaweb.eu',
  images: [{ src: 'assets/ls/map/ls-map.jpg', size: 3656 }, { src: 'assets/ls/map/ls-map-hd.jpg', size: 7312 }],
  aspect: round(BOUNDS.width / BOUNDS.height),
  groups,
  points
};
for (const p of points) if (!(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1)) throw new Error(`fora do mapa: ${p.id}`);
fs.writeFileSync(path.join(root, 'data/ls-map.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`${points.length} pontos em ${groups.reduce((n, g) => n + g.categories.length, 0)} categorias`);
