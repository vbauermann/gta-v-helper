// Icon set, all static markup parsed once. Line icons follow Lucide (as in Nexo); the business
// glyphs are filled silhouettes after the in-game map blips (source files in assets/icons).
(function () {
  'use strict';

  const LINE = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    businesses: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
    cayo: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    drumstick: '<path d="M15.4 15.63a7.875 6 135 1 1 6.13-6.13 4.5 1.5 135 0 0-6.13 6.13"/><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    frame: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    radiation: '<path d="M12 12h.01"/><path d="M7.5 4.2c-.3-.5-.9-.7-1.3-.4C3.9 5.5 2.3 8.1 2 11c0 .5.4 1 1 1h5c0-1.5.8-2.8 2-3.4-1.1-1.9-2.1-3.7-2.5-4.4z"/><path d="M21 12c.6 0 1-.4 1-1-.3-2.9-1.8-5.5-4.1-7.1-.4-.3-1.1-.2-1.3.3-.4.7-1.5 2.5-2.6 4.3 1.2.7 2 2 2 3.4h5z"/><path d="M7.5 19.8c-.3.5-.1 1.1.4 1.3 2.6 1.2 5.6 1.2 8.2 0 .5-.2.7-.8.4-1.3-.5-.9-1.4-2.5-2.5-4.3-1.2.7-2.8.7-4 0-1.1 1.8-2 3.4-2.5 4.3z"/>',
    vault: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="7.5" cy="7.5" r=".5"/><path d="m7.9 7.9 2.7 2.7"/><circle cx="16.5" cy="7.5" r=".5"/><path d="m13.4 10.6 2.7-2.7"/><circle cx="7.5" cy="16.5" r=".5"/><path d="m7.9 16.1 2.7-2.7"/><circle cx="16.5" cy="16.5" r=".5"/><path d="m13.4 13.4 2.7 2.7"/><circle cx="12" cy="12" r="2"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    flask: '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    bank: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 8 5H4Z"/>',
    casino: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
    payouts: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M12 3v18"/>',
    settings: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    gamepad: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    box: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/>',
    dollar: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    download: '<path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
    notes: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    map: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    move: '<path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    keyboard: '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 11.994 2z"/>'
  };

  const SOLID = {
    cocaine: '<rect x="3" y="7" width="18" height="11" rx="1.5" fill="currentColor"/><rect x="3" y="11" width="18" height="2.5" fill="#000" opacity=".35"/><rect x="10.5" y="7" width="3" height="11" fill="#000" opacity=".35"/><path d="M6 7l2-3h8l2 3z" fill="currentColor" opacity=".75"/>',
    meth: '<path d="M9 2h6v2h-1v5.2l5.6 9.3A2 2 0 0 1 17.9 21H6.1a2 2 0 0 1-1.7-2.5L10 9.2V4H9z" fill="currentColor"/><path d="M7.3 15h9.4l1.4 2.4c.3.6-.1 1.1-.7 1.1H6.6c-.6 0-1-.5-.7-1.1z" fill="#000" opacity=".35"/>',
    cash: '<rect x="2" y="9" width="17" height="10" rx="1.5" fill="currentColor" opacity=".6"/><rect x="5" y="5" width="17" height="10" rx="1.5" fill="currentColor"/><circle cx="13.5" cy="10" r="3" fill="#000" opacity=".35"/><path d="M14.6 8.4h-1.6a.9.9 0 0 0 0 1.8h1a.9.9 0 0 1 0 1.8h-1.7M13.5 7.6v.8M13.5 12v.8" stroke="#000" stroke-opacity=".6" stroke-width=".8" fill="none"/>',
    weed: '<path d="M12 15.5 Q15.20 8.75 12.00 2.00 Q8.80 8.75 12 15.5Z M12 15.5 Q10.85 8.98 5.12 5.67 Q6.26 12.19 12 15.5Z M12 15.5 Q17.74 12.19 18.88 5.67 Q13.15 8.98 12 15.5Z M12 15.5 Q8.19 11.84 2.96 12.56 Q6.77 16.22 12 15.5Z M12 15.5 Q17.23 16.22 21.04 12.56 Q15.81 11.84 12 15.5Z M12 15.5 Q8.36 15.01 5.89 17.72 Q9.53 18.21 12 15.5Z M12 15.5 Q14.47 18.21 18.11 17.72 Q15.64 15.01 12 15.5Z" fill="currentColor"/><rect x="11.35" y="15" width="1.3" height="7" rx=".65" fill="currentColor"/>',
    documents: '<rect x="4" y="2" width="16" height="20" rx="2" fill="currentColor"/><circle cx="12" cy="9" r="3" fill="#000" opacity=".4"/><rect x="7" y="14" width="10" height="1.6" rx=".8" fill="#000" opacity=".4"/><rect x="8.5" y="17.2" width="7" height="1.6" rx=".8" fill="#000" opacity=".4"/>',
    bunker: '<path d="M2 20a10 10 0 0 1 20 0z" fill="currentColor"/><path d="M8 20v-4a4 4 0 0 1 8 0v4z" fill="#000" opacity=".45"/><rect x="11.3" y="13" width="1.4" height="7" fill="currentColor"/><rect x="1" y="20" width="22" height="2" rx="1" fill="currentColor"/>',
    acid: '<path d="M12 2c3.8 5 7 8.6 7 12.2A7 7 0 0 1 5 14.2C5 10.6 8.2 7 12 2z" fill="currentColor"/><circle cx="9.6" cy="13.5" r="1.1" fill="#000" opacity=".5"/><circle cx="14.4" cy="13.5" r="1.1" fill="#000" opacity=".5"/><path d="M9 16.3c1.7 1.8 4.3 1.8 6 0" stroke="#000" stroke-opacity=".5" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
    // Nightclub (disco ball), CEO special cargo (crate) and Import/Export vehicle warehouse (car).
    nightclub: '<circle cx="12" cy="13" r="8" fill="currentColor"/><path d="M4.5 11h15M4.5 15h15M12 5v16M8 6.2c-1.2 4.2-1.2 9.6 0 13.6M16 6.2c1.2 4.2 1.2 9.6 0 13.6" stroke="#000" stroke-width="1" opacity=".38" fill="none"/><path d="M12 1.5V5" stroke="currentColor" stroke-width="1.6"/>',
    cargo: '<rect x="3" y="5" width="18" height="15" rx="1.5" fill="currentColor"/><path d="M3 10h18M3 15h18" stroke="#000" stroke-width="1.2" opacity=".35"/><path d="M6 5l12 15M18 5L6 20" stroke="#000" stroke-width="1.4" opacity=".3"/>',
    vehicles: '<path d="M3 16v-3.2l2.2-4.6A2 2 0 0 1 7 7h10a2 2 0 0 1 1.8 1.2l2.2 4.6V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor"/><path d="M6.2 11.5l1.4-3h8.8l1.4 3z" fill="#000" opacity=".4"/><circle cx="7.2" cy="17" r="2.2" fill="currentColor"/><circle cx="16.8" cy="17" r="2.2" fill="currentColor"/><circle cx="7.2" cy="17" r="1" fill="#000" opacity=".45"/><circle cx="16.8" cy="17" r="1" fill="#000" opacity=".45"/>',
    // Cayo Perico secondary loot, after the scope-out icons.
    'loot-gold': '<path d="M2.5 20l1.8-5h6.4l1.8 5z" fill="currentColor"/><path d="M11.5 20l1.8-5h6.4l1.8 5z" fill="currentColor" opacity=".85"/><path d="M7 13.5l1.8-5h6.4l1.8 5z" fill="currentColor"/><path d="M9.6 10.2h4.8" stroke="#000" stroke-opacity=".3" stroke-width="1"/>',
    'loot-cocaine': '<rect x="3" y="7" width="18" height="11" rx="1.5" fill="currentColor"/><rect x="3" y="11" width="18" height="2.5" fill="#000" opacity=".35"/><rect x="10.5" y="7" width="3" height="11" fill="#000" opacity=".35"/>',
    'loot-weed': '<path d="M12 15.5 Q15.20 8.75 12.00 2.00 Q8.80 8.75 12 15.5Z M12 15.5 Q10.85 8.98 5.12 5.67 Q6.26 12.19 12 15.5Z M12 15.5 Q17.74 12.19 18.88 5.67 Q13.15 8.98 12 15.5Z M12 15.5 Q8.19 11.84 2.96 12.56 Q6.77 16.22 12 15.5Z M12 15.5 Q17.23 16.22 21.04 12.56 Q15.81 11.84 12 15.5Z" fill="currentColor"/><rect x="11.35" y="15" width="1.3" height="7" rx=".65" fill="currentColor"/>',
    'loot-cash': '<path d="M12 2.5v19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M17 6.8C16 5.2 14.2 4.3 12 4.3c-2.8 0-4.8 1.5-4.8 3.7 0 5 9.8 2.7 9.8 8.1 0 2.3-2.1 3.9-5 3.9-2.4 0-4.3-1-5.3-2.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    'loot-paintings': '<rect x="3" y="4" width="18" height="16" rx="1.5" fill="currentColor"/><rect x="5.5" y="6.5" width="13" height="11" fill="#000" opacity=".45"/><path d="M6 17l4-5 3 3 2-2 3.5 4z" fill="currentColor"/><circle cx="15.5" cy="9.5" r="1.3" fill="currentColor"/>',
    // App logo: the Nexo gradient tile with a GTA-style serif V (same drawing as tools/make-icon.cjs).
    logo: '<defs><linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7f93ff"/><stop offset=".55" stop-color="#9b7cff"/><stop offset="1" stop-color="#c76bf2"/></linearGradient></defs><rect x="1" y="1" width="30" height="30" rx="9" fill="url(#logo-g)"/><polygon points="7,8 14.2,8 14.2,9.4 12.8,9.4 17.3,19.6 21.4,9.4 19.8,9.4 19.8,8 25,8 25,9.4 23.6,9.4 16.6,25 15.2,25 8.6,9.4 7,9.4" fill="#fff"/>'
  };

  const NS = 'http://www.w3.org/2000/svg';
  const parser = new DOMParser();
  const cache = new Map();

  function template(name) {
    if (cache.has(name)) return cache.get(name);
    let markup;
    if (LINE[name]) markup = `<svg xmlns="${NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${LINE[name]}</svg>`;
    else if (name === 'logo') markup = `<svg xmlns="${NS}" viewBox="0 0 32 32">${SOLID.logo}</svg>`;
    else if (SOLID[name]) markup = `<svg xmlns="${NS}" viewBox="0 0 24 24">${SOLID[name]}</svg>`;
    else throw new Error(`ícone desconhecido: ${name}`);
    const svg = parser.parseFromString(markup, 'image/svg+xml').documentElement;
    cache.set(name, svg);
    return svg;
  }

  function icon(name, size = 18) {
    const svg = document.importNode(template(name), true);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  }

  window.Icons = { icon };
})();
