// On-screen notices (over the game, click-through), same layout as a row of the Avisos list.
// The main process sends the current list; each one leaves after 10 s (toast.cjs).
(function () {
  'use strict';
  const box = document.getElementById('toasts');
  const el = (tag, cls, ...children) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    for (const c of children) if (c != null) n.append(c);
    return n;
  };
  window.marker.onToasts(list => {
    const keep = new Set(list.map(t => t.id));
    for (const n of [...box.children]) if (!keep.has(n.dataset.id)) n.remove();
    for (const t of list) {
      if (box.querySelector(`[data-id="${CSS.escape(t.id)}"]`)) continue;
      const k = GtaNotices.STYLE[t.kind] || GtaNotices.STYLE.reminder;
      const row = el('div', 'toast',
        el('span', `notice-icon ${k.tone}`, Icons.icon(k.icon, 16)),
        el('span', 'notice-text', el('span', 'notice-title', t.title), t.body ? el('span', 'notice-body', t.body) : null));
      row.dataset.id = t.id;
      box.prepend(row); // newest on top, like the list
    }
  });
})();
