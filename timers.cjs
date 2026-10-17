// Advances owned businesses by the online time that passed and returns the alerts to notify.
const { project, formatMinutes } = require('./lib/production.js');

function advance(state, catalog, deltaMinutes) {
  const alerts = [];
  for (const def of catalog.businesses) {
    const biz = state.businesses[def.id];
    if (!biz.owned) continue;
    biz.activeMinutes += deltaMinutes;
    const p = project(def, biz, biz.activeMinutes);
    const warnAt = state.settings.warnMinutes;
    if (p.deliveryIn) continue; // supplies on the way: nothing to warn about yet
    if (p.stopsOn === 'supply') {
      if (!p.producing && biz.supplyPct > 0 && !biz.alerts.empty) {
        biz.alerts.empty = biz.alerts.warned = true;
        alerts.push({ id: def.id, kind: 'empty', title: `${def.name}: sem suprimentos`, body: 'A produção parou. Hora de ressuprir.' });
      } else if (p.producing && warnAt > 0 && p.minutesToStop <= warnAt && !biz.alerts.warned) {
        biz.alerts.warned = true;
        alerts.push({ id: def.id, kind: 'warn', title: `${def.name}: suprimentos acabando`, body: `Acabam em ${formatMinutes(p.minutesToStop)} de jogo.` });
      }
    } else if (!p.producing && biz.stock < def.capacity && !biz.alerts.full) {
      biz.alerts.full = true;
      alerts.push({ id: def.id, kind: 'full', title: `${def.name}: estoque cheio`, body: 'A produção parou. Hora de vender.' });
    }
  }
  return alerts;
}

module.exports = { advance };
