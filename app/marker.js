// Full-screen, click-through layer: a border around each right fingerprint component.
(function () {
  'use strict';
  const root = document.getElementById('boxes');
  window.marker.onBoxes(boxes => {
    root.replaceChildren(...boxes.map(b => {
      const el = document.createElement('div');
      el.className = 'box';
      const pad = 9; // outside the tile, so the border never covers the piece
      el.style.left = `${b.x - pad}px`;
      el.style.top = `${b.y - pad}px`;
      el.style.width = `${b.width + pad * 2}px`;
      el.style.height = `${b.height + pad * 2}px`;
      return el;
    }));
  });
})();
