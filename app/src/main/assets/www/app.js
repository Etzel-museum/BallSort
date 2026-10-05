(function () {
  'use strict';

  const Core = window.Core;
  const CAP = Core.CAP;
  const $ = s => document.querySelector(s);

  // ---------- economy ----------
  const BASE = { undo: 2, hint: 5, tube: 25 };
  const WIN_COINS = 10, BONUS_COINS = 5, START_COINS = 50;

  // ---------- look ----------
  const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#9ccc65', '#2e7d32', '#4fc3f7',
                  '#1e40af', '#8e24aa', '#f06292', '#795548', '#9e9e9e', '#f5f5f5'];
  const LIGHT_COLORS = new Set([2, 3, 5, 10, 11]);
  const VS = '︎'; // force text (not emoji) rendering
  const SYMBOLS = ['●', '▲', '■', '★' + VS, '♥' + VS, '◆', '✚', '✖' + VS, '♣' + VS, '♠' + VS, '☀' + VS, '♪' + VS];

  const SKINS = [
    { id: 'glossy', name: 'מבריק', price: 0 },
    { id: 'flat', name: 'שטוח', price: 100 },
    { id: 'symbols', name: 'עם סמלים', price: 150 },
    { id: 'gems', name: 'אבני חן', price: 250 },
  ];
  const BACKGROUNDS = [
    { id: 'night', name: 'לילה', price: 0, css: 'linear-gradient(165deg, #1d2d4f, #0d1526)' },
    { id: 'light', name: 'בהיר', price: 100, css: 'linear-gradient(165deg, #f1f4f9, #cfd9e7)', light: true },
    { id: 'ocean', name: 'ים', price: 100, css: 'linear-gradient(165deg, #12618f, #0a2c48)' },
    { id: 'forest', name: 'יער', price: 150, css: 'linear-gradient(165deg, #2f6142, #11281a)' },
    { id: 'sunset', name: 'שקיעה', price: 200, css: 'linear-gradient(175deg, #f39a5f 0%, #b9466a 48%, #36204a 100%)' },
    { id: 'wood', name: 'עץ', price: 250, css: 'linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.45)), repeating-linear-gradient(93deg, #8a5a30 0 22px, #7b4f29 22px 40px, #92623b 40px 58px)' },
  ];

  // ---------- saved state ----------
  const KEY = 'ballsort.v1';
  function freshSave() {
    return {
      v: 1, coins: START_COINS, maxLevel: 1,
      settings: { sound: true, vibrate: true },
      owned: ['skin:glossy', 'bg:night'], skin: 'glossy', bg: 'night',
      game: null, seenHelp: false,
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return s;
    } catch (e) { /* fall through */ }
    return freshSave();
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }
  const S = load();
  let G = null;          // current game (also stored as S.game)
  let sel = null;        // index of tube whose top ball is lifted

  // ---------- game setup ----------
  function newGame(n) {
    const L = Core.generateLevel(n);
    let id = 0;
    return {
      level: n, par: L.par, hard: L.hard, hidden: L.hidden,
      tubes: L.tubes.map(t => t.map((c, i) => ({ id: id++, c, h: L.hidden && i < t.length - 1 }))),
      history: [], moves: 0, undos: 0, hints: 0, extra: false, won: false,
    };
  }
  function startLevel(n) {
    sel = null;
    G = newGame(n);
    S.game = G;
    persist();
    render();
    hud();
  }
  function restartLevel() {
    const keep = { undos: G.undos, hints: G.hints, extra: G.extra };
    sel = null;
    G = Object.assign(newGame(G.level), keep);
    if (keep.extra) G.tubes.push([]);
    S.game = G;
    persist();
    render();
    hud();
  }

  const colorsOf = t => t.map(b => b.c);
  const allColors = () => G.tubes.map(colorsOf);
  const isDone = i => Core.isComplete(colorsOf(G.tubes[i]), CAP);
  const top = i => G.tubes[i][G.tubes[i].length - 1];
  const price = kind => kind === 'tube' ? BASE.tube : BASE[kind] * Math.pow(2, kind === 'undo' ? G.undos : G.hints);

  // ---------- layout & rendering ----------
  const board = $('#board');
  let LY = null;
  let tubeEls = [];
  const ballEls = new Map();

  function computeLayout(W, H, n) {
    const rows = n <= 6 ? 1 : 2;
    const perRow = Math.ceil(n / rows);
    const colW = Math.min(W / perRow, 92);
    let b = Math.min(colW * 0.7, 46);
    b = Math.min(b, H / (rows * (CAP + 1.75) + (rows - 1) * 0.5));
    const p = Math.max(3, b * 0.09);
    const tubeW = b + 2 * p;
    const tubeH = b * CAP + 2 * p + b * 0.25;
    const lift = b * 1.35;
    const rowH = lift + tubeH;
    const gap = rows > 1 ? b * 0.5 : 0;
    const total = rows * rowH + gap * (rows - 1);
    const y0 = Math.max(0, (H - total) / 2);
    const tubes = [];
    for (let i = 0; i < n; i++) {
      const r = i < perRow ? 0 : 1;
      const idx = r ? i - perRow : i;
      const inRow = r ? n - perRow : Math.min(perRow, n);
      const x0 = (W - inRow * colW) / 2;
      const colX = x0 + idx * colW;
      const rowY = y0 + r * (rowH + gap);
      tubes.push({ colX, cx: colX + colW / 2, rowY, tubeTop: rowY + lift });
    }
    return { b, p, tubeW, tubeH, colW, rowH, tubes };
  }
  function slotPos(i, j) {
    const t = LY.tubes[i];
    return { x: t.cx - LY.b / 2, y: t.tubeTop + LY.tubeH - LY.p - (j + 1) * LY.b };
  }
  function liftPos(i) {
    const t = LY.tubes[i];
    return { x: t.cx - LY.b / 2, y: t.rowY + LY.b * 0.2 };
  }
  const tf = p => `translate(${p.x}px, ${p.y}px)`;
  function setPos(el, p) { el.style.transform = tf(p); }

  function makeBall(b, size) {
    const el = document.createElement('div');
    el.className = 'ball' + (b.h ? ' hid' : '');
    el.style.setProperty('--c', COLORS[b.c]);
    el.style.width = el.style.height = size + 'px';
    el.style.fontSize = Math.round(size * 0.55) + 'px';
    const sym = document.createElement('span');
    sym.className = 'sym';
    sym.textContent = SYMBOLS[b.c];
    sym.style.color = LIGHT_COLORS.has(b.c) ? 'rgba(0,0,0,.6)' : '#fff';
    el.appendChild(sym);
    return el;
  }

  function render() {
    finishAnims();
    board.innerHTML = '';
    board.className = 'skin-' + S.skin;
    tubeEls = [];
    ballEls.clear();
    LY = computeLayout(board.clientWidth, board.clientHeight, G.tubes.length);

    G.tubes.forEach((t, i) => {
      const L = LY.tubes[i];
      const col = document.createElement('div');
      col.className = 'col';
      Object.assign(col.style, { left: L.colX + 'px', top: L.rowY + 'px', width: LY.colW + 'px', height: LY.rowH + 'px' });
      col.addEventListener('pointerdown', e => { e.preventDefault(); onTubeTap(i); });
      board.appendChild(col);

      const tube = document.createElement('div');
      tube.className = 'tube' + (isDone(i) ? ' done' : '');
      Object.assign(tube.style, {
        left: (L.cx - LY.tubeW / 2) + 'px', top: L.tubeTop + 'px',
        width: LY.tubeW + 'px', height: LY.tubeH + 'px',
      });
      board.appendChild(tube);
      tubeEls[i] = tube;

      t.forEach((b, j) => {
        const el = makeBall(b, LY.b);
        board.appendChild(el);
        ballEls.set(b.id, el);
        setPos(el, slotPos(i, j));
      });
    });
    if (sel !== null) setPos(ballEls.get(top(sel).id), liftPos(sel));
  }

  // ---------- animation ----------
  const anims = new Set();
  function animate(el, pts, duration) {
    setPos(el, pts[pts.length - 1]);
    if (!el.animate) return;
    const a = el.animate(pts.map(p => ({ transform: tf(p) })), { duration, easing: 'ease-in-out' });
    anims.add(a);
    a.onfinish = a.oncancel = () => anims.delete(a);
  }
  function finishAnims() {
    for (const a of Array.from(anims)) { try { a.finish(); } catch (e) { /* already done */ } }
  }

  // ---------- sound & vibration ----------
  let ac = null;
  function audio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, when) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + (when || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function sfx(name) {
    if (!S.settings.sound) return;
    switch (name) {
      case 'pick': tone(620, 0.07, 'triangle', 0.12); break;
      case 'drop': tone(420, 0.09, 'triangle', 0.15); break;
      case 'bad': tone(170, 0.12, 'square', 0.04); break;
      case 'done': [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'sine', 0.14, i * 0.07)); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'sine', 0.16, i * 0.11)); break;
      case 'coin': tone(988, 0.07, 'square', 0.04); tone(1319, 0.14, 'square', 0.04, 0.06); break;
    }
  }
  function buzz(pattern) {
    if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ } }
  }

  // ---------- playing ----------
  function clearHint() {
    tubeEls.forEach(t => t && t.classList.remove('hint-from', 'hint-to'));
  }
  function lift(i) {
    sel = i;
    const el = ballEls.get(top(i).id);
    animate(el, [slotPos(i, G.tubes[i].length - 1), liftPos(i)], 110);
    sfx('pick');
  }
  function dropBack() {
    if (sel === null) return;
    const i = sel;
    sel = null;
    animate(ballEls.get(top(i).id), [liftPos(i), slotPos(i, G.tubes[i].length - 1)], 110);
  }

  function onTubeTap(i) {
    if (!$('#modal').hidden || G.won) return;
    finishAnims();
    clearHint();
    if (sel === null) {
      if (G.tubes[i].length && !isDone(i)) lift(i);
      return;
    }
    if (sel === i) { dropBack(); return; }
    if (Core.canMove(allColors(), sel, i, CAP)) { move(sel, i); return; }
    // Not a legal target: put the ball back and pick up from the tapped tube instead.
    dropBack();
    sfx('bad');
    if (G.tubes[i].length && !isDone(i)) lift(i);
  }

  function move(f, t) {
    sel = null;
    const ball = G.tubes[f].pop();
    G.tubes[t].push(ball);
    G.history.push([f, t]);
    G.moves++;
    animate(ballEls.get(ball.id), [liftPos(f), liftPos(t), slotPos(t, G.tubes[t].length - 1)], 260);
    sfx('drop');

    const newTop = top(f);
    if (newTop && newTop.h) {
      newTop.h = false;
      const el = ballEls.get(newTop.id);
      el.classList.remove('hid');
      el.classList.add('reveal');
    }
    if (isDone(t)) {
      setTimeout(() => {
        sfx('done'); buzz(30);
        tubeEls[t].classList.add('done', 'flash');
        setTimeout(() => tubeEls[t] && tubeEls[t].classList.remove('flash'), 650);
      }, 230);
    }
    persist();
    hud();
    afterMove();
  }

  function afterMove() {
    const cols = allColors();
    if (Core.isSolved(cols, CAP)) { G.won = true; setTimeout(win, 550); return; }
    if (!Core.hasAnyMove(cols, CAP)) setTimeout(() => { if (!Core.hasAnyMove(allColors(), CAP)) stuck(); }, 450);
  }

  function spend(amount) {
    if (S.coins < amount) {
      toast('אין מספיק מטבעות. מטבעות מרוויחים בסיום כל שלב.');
      sfx('bad');
      return false;
    }
    S.coins -= amount;
    bumpCoins();
    return true;
  }

  function undo() {
    if (G.won) return;
    if (!G.history.length) { toast('אין מהלך לבטל'); return; }
    if (!spend(price('undo'))) return;
    finishAnims(); clearHint(); dropBack(); finishAnims();
    G.undos++;
    const [f, t] = G.history.pop();
    const ball = G.tubes[t].pop();
    G.tubes[f].push(ball);
    G.moves = Math.max(0, G.moves - 1);
    animate(ballEls.get(ball.id), [slotPos(t, G.tubes[t].length), liftPos(t), liftPos(f), slotPos(f, G.tubes[f].length - 1)], 330);
    tubeEls[t].classList.toggle('done', isDone(t));
    sfx('drop');
    persist();
    hud();
  }

  function hint() {
    if (G.won) return;
    if (S.coins < price('hint')) { spend(price('hint')); return; }
    finishAnims(); clearHint(); dropBack(); finishAnims();
    const sol = Core.solve(allColors(), CAP, 150000);
    if (!sol) { toast('אין פתרון מהמצב הזה. בטל כמה מהלכים, הוסף מבחנה או התחל מחדש.', 3500); return; }
    if (!sol.moves.length) return;
    spend(price('hint'));
    G.hints++;
    const [f, t] = sol.moves[0];
    tubeEls[f].classList.add('hint-from');
    tubeEls[t].classList.add('hint-to');
    toast('העבר כדור מהמבחנה הצהובה לירוקה');
    persist();
    hud();
  }

  function addTube() {
    if (G.won) return;
    if (G.extra) { toast('אפשר להוסיף מבחנה אחת בכל שלב'); return; }
    if (!spend(BASE.tube)) return;
    G.extra = true;
    G.tubes.push([]);
    sel = null;
    sfx('coin');
    persist();
    render();
    hud();
  }

  // ---------- HUD ----------
  function hud() {
    $('#levelTitle').textContent = 'שלב ' + G.level;
    $('#levelBadge').textContent = G.hard ? 'שלב קשה' : G.hidden ? 'כדורים נסתרים' : '';
    $('#coinVal').textContent = S.coins;
    const pu = price('undo'), ph = price('hint');
    $('#pUndo').textContent = pu;
    $('#pHint').textContent = ph;
    $('#pTube').textContent = G.extra ? '✓' : BASE.tube;
    $('#pUndo').parentNode.classList.toggle('short', S.coins < pu);
    $('#pHint').parentNode.classList.toggle('short', S.coins < ph);
    $('#pTube').parentNode.classList.toggle('short', !G.extra && S.coins < BASE.tube);
    $('#btnUndo').classList.toggle('dim', !G.history.length);
    $('#btnTube').classList.toggle('dim', G.extra);
    $('#tip').textContent = G.level <= 2 && !G.moves
      ? 'הקש על מבחנה כדי להרים כדור, ואז על מבחנה אחרת כדי להניח אותו שם'
      : '';
  }
  function bumpCoins() {
    const c = $('#coins');
    c.classList.remove('bump');
    void c.offsetWidth;
    c.classList.add('bump');
    $('#coinVal').textContent = S.coins;
  }

  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2300);
  }

  // ---------- modals ----------
  let modalBack = null;   // what the Android back button does while a modal is open
  function openModal(html, onBack) {
    $('#sheet').innerHTML = html;
    $('#modal').hidden = false;
    modalBack = onBack || closeModal;
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#sheet').innerHTML = '';
    modalBack = null;
  }
  function on(sel, fn) {
    const el = $('#sheet ' + sel);
    if (el) el.addEventListener('click', fn);
  }
  const coinPrice = n => `<span class="price"><i class="coin"></i><b>${n}</b></span>`;

  function win() {
    clearHint();
    const first = G.level >= S.maxLevel;
    let earned = 0, bonus = 0;
    if (first) {
      earned = WIN_COINS;
      if (G.moves <= G.par) bonus = BONUS_COINS;
      S.coins += earned + bonus;
      S.maxLevel = G.level + 1;
    }
    const done = G.level;
    S.game = null;
    persist();
    sfx('win'); buzz([40, 60, 40]); confetti();
    hud();
    if (first) bumpCoins();

    const next = () => { closeModal(); startLevel(S.maxLevel); };
    openModal(`
      <h2>כל הכבוד!</h2>
      <p class="center">שלב ${done} הושלם ב-${G.moves} מהלכים</p>
      ${first ? `<div class="win-coins">+${earned + bonus} <i class="coin"></i></div>
        <p class="center muted">${bonus ? 'כולל בונוס של ' + bonus + ' על פתרון ב-' + G.par + ' מהלכים או פחות' : 'פתרון ב-' + G.par + ' מהלכים או פחות מזכה בבונוס של ' + BONUS_COINS}</p>`
        : '<p class="center muted">שלב שכבר נפתר בעבר אינו מזכה במטבעות</p>'}
      <button class="btn primary" id="mNext">${first ? 'לשלב הבא' : 'חזרה לשלב ' + S.maxLevel}</button>`, next);
    on('#mNext', next);
  }

  function stuck() {
    if (G.won || !$('#modal').hidden) return;
    openModal(`
      <h2>אין יותר מהלכים</h2>
      <p class="center">אפשר לבטל מהלך, להוסיף מבחנה או להתחיל את השלב מחדש.</p>
      <button class="btn" id="mUndo">ביטול מהלך ${coinPrice(price('undo'))}</button>
      ${G.extra ? '' : `<button class="btn" id="mTube">הוספת מבחנה ${coinPrice(BASE.tube)}</button>`}
      <button class="btn" id="mRestart">התחלה מחדש</button>`);
    on('#mUndo', () => { closeModal(); undo(); });
    on('#mTube', () => { closeModal(); addTube(); });
    on('#mRestart', () => { closeModal(); restartLevel(); });
  }

  function confirmRestart() {
    if (!G.moves) { restartLevel(); return; }
    openModal(`
      <h2>להתחיל מחדש?</h2>
      <p class="center">השלב יחזור למצב ההתחלתי.${G.extra ? ' המבחנה שנוספה תישאר.' : ''}</p>
      <div class="row"><button class="btn primary" id="mYes">כן, מחדש</button><button class="btn" id="mNo">לא</button></div>`);
    on('#mYes', () => { closeModal(); restartLevel(); });
    on('#mNo', closeModal);
  }

  function menu() {
    const tg = on => `<span class="toggle${on ? ' on' : ''}"></span>`;
    openModal(`
      <h2>תפריט</h2>
      <button class="btn" id="mLevels">בחירת שלב</button>
      <button class="btn" id="mShop">חנות עיצובים</button>
      <button class="btn menu-item" id="mSound">צלילים ${tg(S.settings.sound)}</button>
      <button class="btn menu-item" id="mVib">רטט ${tg(S.settings.vibrate)}</button>
      <button class="btn" id="mHelp">איך משחקים</button>
      <button class="btn primary" id="mClose">חזרה למשחק</button>`);
    on('#mLevels', levels);
    on('#mShop', shop);
    on('#mHelp', help);
    on('#mSound', () => { S.settings.sound = !S.settings.sound; persist(); menu(); });
    on('#mVib', () => { S.settings.vibrate = !S.settings.vibrate; persist(); if (S.settings.vibrate) buzz(40); menu(); });
    on('#mClose', closeModal);
  }

  function levels() {
    let cells = '';
    for (let n = 1; n <= S.maxLevel; n++) {
      cells += `<button data-n="${n}" class="${n === G.level ? 'cur' : n < S.maxLevel ? 'done' : ''}">${n}</button>`;
    }
    openModal(`
      <h2>בחירת שלב</h2>
      <p class="center muted">אפשר לחזור לכל שלב שכבר נפתר</p>
      <div class="levels">${cells}</div>
      <button class="btn primary" id="mBack">חזרה</button>`, menu);
    $('#sheet .levels').addEventListener('click', e => {
      const n = +e.target.dataset.n;
      if (!n) return;
      closeModal();
      if (n !== G.level) startLevel(n);
    });
    on('#mBack', menu);
    const cur = $('#sheet .levels .cur') || $('#sheet .levels button:last-child');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }

  let pendingBuy = null;
  function shop() {
    const ballPreview = id => `<div class="preview-balls skin-${id}">${[0, 5, 2, 7].map(c => makeBall({ c, h: false }, 26).outerHTML).join('')}</div>`;
    const card = (kind, it, preview) => {
      const key = kind + ':' + it.id;
      const owned = S.owned.includes(key);
      const selected = (kind === 'skin' ? S.skin : S.bg) === it.id;
      let action;
      if (selected) action = '<button class="btn" disabled>נבחר ✓</button>';
      else if (owned) action = `<button class="btn" data-pick="${key}">בחירה</button>`;
      else if (pendingBuy === key) action = `<button class="btn primary" data-buy="${key}">לקנות?</button>`;
      else action = `<button class="btn" data-buy="${key}">${coinPrice(it.price)}</button>`;
      return `<div class="item${selected ? ' sel' : ''}">${preview}<div class="name">${it.name}</div>${action}</div>`;
    };
    openModal(`
      <h2>חנות עיצובים</h2>
      <p class="center muted">יש לך <b>${S.coins}</b> מטבעות</p>
      <div id="shopItems">
        <h3>כדורים</h3>
        <div class="shop">${SKINS.map(s => card('skin', s, ballPreview(s.id))).join('')}</div>
        <h3>רקע</h3>
        <div class="shop">${BACKGROUNDS.map(b => card('bg', b, `<div class="swatch" style="background:${b.css}"></div>`)).join('')}</div>
      </div>
      <button class="btn primary" id="mBack">חזרה</button>`, () => { pendingBuy = null; menu(); });
    on('#shopItems', shopClick);
    on('#mBack', () => { pendingBuy = null; menu(); });
  }
  function shopClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const pick = b.dataset.pick, buy = b.dataset.buy;
    if (!pick && !buy) return;
    const key = pick || buy;
    const [kind, id] = key.split(':');
    if (buy) {
      if (pendingBuy !== key) { pendingBuy = key; shop(); return; }
      pendingBuy = null;
      const item = (kind === 'skin' ? SKINS : BACKGROUNDS).find(x => x.id === id);
      if (!spend(item.price)) { shop(); return; }
      S.owned.push(key);
      sfx('coin');
    }
    if (kind === 'skin') S.skin = id; else S.bg = id;
    persist();
    applyTheme();
    render();
    hud();
    shop();
  }

  function help() {
    const first = !S.seenHelp;
    const done = () => { S.seenHelp = true; persist(); if (first) closeModal(); else menu(); };
    openModal(`
      <h2>איך משחקים</h2>
      <p>המטרה: לסדר את הכדורים כך שבכל מבחנה יהיו רק כדורים בצבע אחד.</p>
      <p>הקש על מבחנה כדי להרים את הכדור העליון, ואז הקש על מבחנה אחרת כדי להניח אותו שם.</p>
      <p>אפשר להניח כדור רק במבחנה ריקה, או על כדור באותו צבע כשיש מקום.</p>
      <p>על כל שלב שנפתר מקבלים ${WIN_COINS} מטבעות, ועוד ${BONUS_COINS} על פתרון יעיל. במטבעות אפשר לקנות ביטול מהלך, רמז, מבחנה נוספת ועיצובים.</p>
      <p class="muted">מחיר הביטול והרמז מוכפל בכל שימוש וחוזר להתחלה בכל שלב חדש. מבחנה נוספת אפשר לקנות פעם אחת בשלב.</p>
      <button class="btn primary" id="mOk">${first ? 'מתחילים!' : 'חזרה'}</button>`, done);
    on('#mOk', done);
  }

  function confetti() {
    for (let i = 0; i < 46; i++) {
      const d = document.createElement('div');
      d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = COLORS[i % COLORS.length];
      d.style.animationDuration = (1.4 + Math.random() * 1.3) + 's';
      d.style.animationDelay = Math.random() * 0.4 + 's';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 3300);
    }
  }

  function applyTheme() {
    const bg = BACKGROUNDS.find(b => b.id === S.bg) || BACKGROUNDS[0];
    document.body.style.background = bg.css;
    document.body.classList.toggle('light', !!bg.light);
  }

  // ---------- wiring ----------
  $('#btnRestart').addEventListener('click', confirmRestart);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnHint').addEventListener('click', hint);
  $('#btnTube').addEventListener('click', addTube);
  $('#menuBtn').addEventListener('click', menu);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalBack) modalBack(); });
  document.addEventListener('contextmenu', e => e.preventDefault());
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (G) render(); }, 80);
  });

  // Called by the Android wrapper on the system back button; true = handled here.
  window.onAndroidBack = function () {
    if (modalBack) { modalBack(); return true; }
    if (sel !== null) { finishAnims(); dropBack(); return true; }
    return false;
  };

  applyTheme();
  if (S.game && S.game.level <= S.maxLevel && !S.game.won) {
    G = S.game;
    render();
    hud();
  } else {
    startLevel(S.maxLevel);
  }
  if (!S.seenHelp) help();
})();
