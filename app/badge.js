// Top-right pill shown while fingerprint detection is on.
(function () {
  'use strict';
  const el = document.getElementById('badge');
  window.marker.onBadge(() => { el.hidden = false; });
})();
