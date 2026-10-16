// Top-right pill: tells that fingerprint detection is running (or was just turned off).
(function () {
  'use strict';
  const el = document.getElementById('badge');
  const text = document.getElementById('text');
  window.marker.onBadge(s => {
    el.hidden = false;
    el.className = `badge ${s.on ? (s.found ? 'found' : 'on') : 'off'}`;
    text.textContent = s.on ? (s.found ? 'Detecção de digitais ON · peças marcadas' : 'Detecção de digitais ON') : 'Detecção de digitais OFF';
  });
})();
