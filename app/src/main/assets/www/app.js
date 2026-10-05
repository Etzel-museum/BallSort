(function () {
  'use strict';

  const Core = window.Core, Gfx = window.Gfx, Cat = window.Catalog;
  const CAP = Core.CAP;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // ---------- economy ----------
  const BASE = { undo: 2, hint: 5, tube: 25 };
  const WIN_COINS = 10, BONUS_COINS = 5, START_COINS = 50;

  // ---------- saved state ----------
  const KEY = 'ballsort.v1';
  function freshSave() {
    return {
      v: 2, coins: START_COINS, maxLevel: 1,
      settings: { sound: true, vibrate: true },
      owned: [], skin: 'glossy', bg: 'night', tube: 'classic',
      eggs: 0, stars: {}, game: null, seenHelp: false,
    };
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* fall through */ }
    if (!s || (s.v !== 1 && s.v !== 2)) return freshSave();
    if (s.v === 1) {
      // v1.0 → v2: some backgrounds were retired or became egg rewards; refund them.
      const REFUND = { 'bg:light': 100, 'bg:forest': 150, 'bg:wood': 250 };
      s.owned = (s.owned || []).filter(k => {
        if (REFUND[k]) { s.coins += REFUND[k]; return false; }
        return true;
      });
      s.tube = 'classic'; s.eggs = 0; s.stars = {}; s.v = 2;
    }
    if (!Cat.findItem('bg', s.bg)) s.bg = 'night';
    if (!Cat.findItem('skin', s.skin)) s.skin = 'glossy';
    if (!Cat.findItem('tube', s.tube)) s.tube = 'classic';
    return s;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
  }
  const S = load();
  persist();
  let G = null;          // current game (also stored as S.game)
  let sel = null;        // index of tube whose top ball is lifted
  let screen = 'home';

  const owned = (kind, it) => it.price === 0 || S.owned.includes(kind + ':' + it.id);
  const solvedCount = () => S.maxLevel - 1;
  const eggsEarned = () => Math.floor(solvedCount() / Cat.LEVELS_PER_EGG);
  const pendingEggs = () => Math.max(0, eggsEarned() - S.eggs);
  const eggProgress = () => solvedCount() % Cat.LEVELS_PER_EGG;
  const MYSTERY = { name: '__mystery', base: '#f1e4c6', accent: '#b98f5a', pattern: 'spots' };

  // ---------- level generation off the UI thread ----------
  // core.js is loaded into a Blob worker so big boards never freeze the screen.
  let worker = null, reqId = 0;
  const pending = new Map();
  function runSync(msg) {
    return msg.type === 'gen' ? Core.generateLevel(msg.n) : Core.solve(msg.tubes, CAP, msg.max);
  }
  (async function initWorker() {
    try {
      const src = await (await fetch('core.js')).text();
      const glue = '\nself.onmessage=function(e){var m=e.data,r=null;try{r=m.type==="gen"?Core.generateLevel(m.n):Core.solve(m.tubes,4,m.max);}catch(err){}self.postMessage({id:m.id,r:r});};';
      const w = new Worker(URL.createObjectURL(new Blob([src + glue], { type: 'text/javascript' })));
      w.onmessage = e => {
        const p = pending.get(e.data.id);
        if (p) { pending.delete(e.data.id); p.resolve(e.data.r); }
      };
      w.onerror = () => {
        worker = null;
        for (const [id, p] of pending) { pending.delete(id); p.resolve(runSync(p.msg)); }
      };
      worker = w;
    } catch (e) { worker = null; }
  })();
  function call(msg) {
    if (!worker) return new Promise(res => setTimeout(() => res(runSync(msg)), 0));
    return new Promise(resolve => {
      const id = ++reqId;
      pending.set(id, { resolve, msg });
      worker.postMessage(Object.assign({ id }, msg));
    });
  }
  const levelCache = new Map();
  function getLevel(n) {
    if (!levelCache.has(n)) levelCache.set(n, call({ type: 'gen', n }));
    if (levelCache.size > 6) levelCache.delete(levelCache.keys().next().value);
    return levelCache.get(n);
  }

  // ---------- game setup ----------
  function buildGame(L) {
    let id = 0;
    return {
      level: L.level, par: L.par, hard: L.hard, hidden: L.hidden,
      tubes: L.tubes.map(t => t.map((c, i) => ({ id: id++, c, h: L.hidden && i < t.length - 1 }))),
      history: [], moves: 0, undos: 0, hints: 0, extra: false, won: false,
    };
  }
  let loadingTimer = 0;
  async function startLevel(n, keep) {
    sel = null;
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => { $('#loading').hidden = false; }, 150);
    const L = await getLevel(n);
    clearTimeout(loadingTimer);
    $('#loading').hidden = true;
    G = buildGame(L);
    if (keep) {
      Object.assign(G, keep);
      if (keep.extra) G.tubes.push([]);
    }
    S.game = G;
    persist();
    showGame();
    render(true);
    hud();
    getLevel(n + 1);   // prefetch so "next level" is instant
  }
  function restartLevel() {
    startLevel(G.level, { undos: G.undos, hints: G.hints, extra: G.extra });
  }

  const colorsOf = t => t.map(b => b.c);
  const allColors = () => G.tubes.map(colorsOf);
  const isDone = i => Core.isComplete(colorsOf(G.tubes[i]), CAP);
  const top = i => G.tubes[i][G.tubes[i].length - 1];
  const price = kind => kind === 'tube' ? BASE.tube : BASE[kind] * Math.pow(2, kind === 'undo' ? G.undos : G.hints);

  // ---------- screens ----------
  function applyTheme() {
    const bg = Cat.findItem('bg', S.bg) || Cat.ITEMS.bg[0];
    $('#scene').innerHTML = Gfx.scene(bg.id);
    document.body.classList.toggle('light', !!bg.light);
  }
  function showHome() {
    finishAnims();
    sel = null;
    screen = 'home';
    $('#game').hidden = true;
    const h = $('#home');
    h.hidden = false;
    h.classList.remove('enter'); void h.offsetWidth; h.classList.add('enter');
    refreshHome();
  }
  function showGame() {
    if (screen === 'game') return;
    screen = 'game';
    $('#home').hidden = true;
    const g = $('#game');
    g.hidden = false;
    g.classList.remove('enter'); void g.offsetWidth; g.classList.add('enter');
  }

  function refreshHome() {
    $$('.coinVal').forEach(e => { e.textContent = S.coins; });
    $('#playLevel').textContent = 'שלב ' + (S.game && !S.game.won ? S.game.level : S.maxLevel);

    // decorative mini board
    const box = $('#homeTubes');
    box.innerHTML = '';
    const tw = 44, th = 140, b = 34;
    const sets = [[0, 0, 0, 5], [6, 6, 6, 6], [2, 2, 7, 2]];
    sets.forEach((set, k) => {
      const x = 14 + k * 70;
      const t = document.createElement('div');
      t.className = 'tube' + (k === 1 ? ' done' : '');
      Object.assign(t.style, { left: x + 'px', top: '8px', width: tw + 'px', height: th + 'px' });
      t.innerHTML = Gfx.tubeSVG(S.tube, tw, th);
      box.appendChild(t);
      set.forEach((c, j) => {
        const el = document.createElement('div');
        el.className = 'ball';
        Object.assign(el.style, {
          width: b + 'px', height: b + 'px',
          backgroundImage: `url(${Gfx.ballSprite(S.skin, c, b)})`,
          transform: `translate(${x + (tw - b) / 2}px, ${8 + th - 6 - (j + 1) * b}px)`,
          animationDelay: (k * 0.3 + j * 0.15) + 's',
        });
        box.appendChild(el);
      });
    });

    const card = $('#eggCard');
    const egg = `<img src="${Gfx.eggArt(MYSTERY, 46, 9)}" alt="">`;
    const p = pendingEggs();
    card.classList.toggle('ready', p > 0);
    if (p > 0) {
      card.innerHTML = `${egg}<div class="txt">${p > 1 ? p + ' ביצים מחכות' : 'ביצה מחכה'} לבקיעה!<div class="muted" style="font-size:13px;opacity:.8">הקש כדי לבקוע</div></div>`;
    } else {
      const left = Cat.LEVELS_PER_EGG - eggProgress();
      card.innerHTML = `${egg}<div class="txt">עוד ${left} ${left === 1 ? 'שלב' : 'שלבים'} לביצה הבאה<div class="bar"><b style="width:${eggProgress() * 10}%"></b></div></div>`;
    }
  }

  // ---------- layout & rendering ----------
  const board = $('#board');
  let LY = null;
  let tubeEls = [];
  const ballEls = new Map();

  function computeLayout(W, H, n) {
    let best = null;
    for (let rows = 1; rows <= 4; rows++) {
      const perRow = Math.ceil(n / rows);
      const colW = Math.min(W / perRow, 96);
      const b = Math.min(colW * 0.7, 46, H / (rows * (CAP + 1.75) + (rows - 1) * 0.45));
      if (!best || b > best.b + 0.5) best = { rows, perRow, colW, b };
    }
    const { rows, perRow, colW, b } = best;
    const p = Math.max(3, b * 0.09);
    const tubeW = b + 2 * p;
    const tubeH = b * CAP + 2 * p + b * 0.25;
    const lift = b * 1.35;
    const rowH = lift + tubeH;
    const gap = rows > 1 ? b * 0.45 : 0;
    const total = rows * rowH + gap * (rows - 1);
    const y0 = Math.max(0, (H - total) / 2);
    const tubes = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / perRow);
      const idx = i - r * perRow;
      const inRow = Math.min(perRow, n - r * perRow);
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

  function spriteFor(b) { return Gfx.ballSprite(S.skin, b.h ? -1 : b.c, LY.b); }
  function makeBall(b) {
    const el = document.createElement('div');
    el.className = 'ball';
    el.style.width = el.style.height = LY.b + 'px';
    el.style.backgroundImage = `url(${spriteFor(b)})`;
    return el;
  }

  function render(entering) {
    finishAnims();
    board.innerHTML = '';
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
      tube.innerHTML = Gfx.tubeSVG(S.tube, LY.tubeW, LY.tubeH);
      board.appendChild(tube);
      tubeEls[i] = tube;
      if (entering && tube.animate) {
        tube.animate([{ opacity: 0, transform: 'translateY(-30px)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, delay: i * 35, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' });
      }

      t.forEach((b, j) => {
        const el = makeBall(b);
        board.appendChild(el);
        ballEls.set(b.id, el);
        const p = slotPos(i, j);
        setPos(el, p);
        if (entering && el.animate) {
          el.animate([{ opacity: 0, transform: tf({ x: p.x, y: p.y - 40 }) }, { opacity: 1, transform: tf(p) }],
            { duration: 380, delay: i * 35 + j * 25, easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' });
        }
      });
    });
    if (sel !== null) {
      const el = ballEls.get(top(sel).id);
      el.classList.add('lifted');
      setPos(el, liftPos(sel));
    }
  }

  // ---------- animation ----------
  const anims = new Set();
  function animate(el, frames, duration, easing) {
    setPos(el, frames[frames.length - 1]);
    if (!el.animate) return;
    const a = el.animate(frames.map(p => {
      const k = { transform: tf(p) };
      if (p.offset !== undefined) k.offset = p.offset;
      return k;
    }), { duration, easing: easing || 'ease-in-out' });
    anims.add(a);
    a.onfinish = a.oncancel = () => anims.delete(a);
  }
  function finishAnims() {
    for (const a of Array.from(anims)) { try { a.finish(); } catch (e) { /* already done */ } }
  }
  // A curved flight from a to b, then a small bounce into the slot.
  function flight(a, b, slot) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - LY.b * 0.35 - dist * 0.18 };
    const pts = [];
    const N = 8;
    for (let k = 0; k <= N; k++) {
      const t = k / N, u = 1 - t;
      pts.push({ x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y, offset: 0.62 * t });
    }
    pts.push({ x: slot.x, y: slot.y + LY.b * 0.08, offset: 0.9 });
    pts.push({ x: slot.x, y: slot.y, offset: 1 });
    return pts;
  }
  function sparks(i) {
    const r = tubeEls[i].getBoundingClientRect();
    const fx = $('#fx');
    for (let k = 0; k < 14; k++) {
      const s = document.createElement('div');
      s.className = 'spark';
      const x = r.left + r.width / 2, y = r.top + r.height * (0.15 + Math.random() * 0.7);
      s.style.left = x - 5 + 'px'; s.style.top = y - 5 + 'px';
      fx.appendChild(s);
      const ang = Math.random() * Math.PI * 2, d = 30 + Math.random() * 45;
      const a = s.animate([
        { transform: 'scale(.4)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * d}px, ${Math.sin(ang) * d}px) scale(1.2)`, opacity: 0 },
      ], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
      a.onfinish = () => s.remove();
    }
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
      case 'drop': tone(420, 0.09, 'triangle', 0.15, 0.12); break;
      case 'bad': tone(170, 0.12, 'square', 0.04); break;
      case 'done': [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'sine', 0.14, i * 0.07)); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'sine', 0.16, i * 0.11)); break;
      case 'coin': tone(988, 0.07, 'square', 0.04); tone(1319, 0.14, 'square', 0.04, 0.06); break;
      case 'crack': tone(140, 0.08, 'sawtooth', 0.06); tone(90, 0.1, 'square', 0.05, 0.05); break;
      case 'hatch': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'sine', 0.13, i * 0.08)); break;
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
    el.classList.add('lifted');
    animate(el, [slotPos(i, G.tubes[i].length - 1), liftPos(i)], 120, 'cubic-bezier(.2,.9,.4,1.2)');
    sfx('pick');
  }
  function dropBack() {
    if (sel === null) return;
    const i = sel;
    sel = null;
    const el = ballEls.get(top(i).id);
    el.classList.remove('lifted');
    animate(el, [liftPos(i), slotPos(i, G.tubes[i].length - 1)], 120);
  }

  function onTubeTap(i) {
    if (!$('#modal').hidden || G.won || hintBusy) return;
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
    const el = ballEls.get(ball.id);
    el.classList.remove('lifted');
    animate(el, flight(liftPos(f), liftPos(t), slotPos(t, G.tubes[t].length - 1)), 340, 'linear');
    sfx('drop');

    const newTop = top(f);
    if (newTop && newTop.h) {
      newTop.h = false;
      const nel = ballEls.get(newTop.id);
      nel.style.backgroundImage = `url(${spriteFor(newTop)})`;
      nel.classList.add('reveal');
    }
    if (isDone(t)) {
      setTimeout(() => {
        if (!tubeEls[t]) return;
        sfx('done'); buzz(30);
        tubeEls[t].classList.add('done');
        sparks(t);
      }, 330);
    }
    persist();
    hud();
    afterMove();
  }

  function afterMove() {
    const cols = allColors();
    if (Core.isSolved(cols, CAP)) { G.won = true; setTimeout(win, 650); return; }
    if (!Core.hasAnyMove(cols, CAP)) setTimeout(() => { if (G && !G.won && !Core.hasAnyMove(allColors(), CAP)) stuck(); }, 500);
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
    animate(ballEls.get(ball.id), flight(slotPos(t, G.tubes[t].length), liftPos(f), slotPos(f, G.tubes[f].length - 1)), 360, 'linear');
    tubeEls[t].classList.toggle('done', isDone(t));
    sfx('drop');
    persist();
    hud();
  }

  let hintBusy = false;
  async function hint() {
    if (G.won || hintBusy) return;
    if (S.coins < price('hint')) { spend(price('hint')); return; }
    finishAnims(); clearHint(); dropBack(); finishAnims();
    hintBusy = true;
    const slow = setTimeout(() => toast('מחפש רמז…', 4000), 250);
    const game = G;
    const sol = await call({ type: 'solve', tubes: allColors(), max: 150000 });
    clearTimeout(slow);
    hintBusy = false;
    if (game !== G || G.won) return;
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
    const el = tubeEls[tubeEls.length - 1];
    if (el.animate) el.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 400, easing: 'cubic-bezier(.2,1.5,.4,1)' });
    hud();
  }

  // ---------- HUD ----------
  function hud() {
    if (!G) return;
    $('#levelTitle').textContent = 'שלב ' + G.level;
    $('#levelBadge').textContent = G.hard ? '★ שלב קשה ★' : G.hidden ? 'כדורים נסתרים' : '';
    $$('.coinVal').forEach(e => { e.textContent = S.coins; });
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
    $('#eggBar').innerHTML = `<img src="${Gfx.eggArt(MYSTERY, 18, 9)}" alt=""><div class="bar"><b style="width:${eggProgress() * 10}%"></b></div><span>${eggProgress()}/${Cat.LEVELS_PER_EGG}</span>`;
  }
  function bumpCoins() {
    $$('.coins').forEach(c => { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
    $$('.coinVal').forEach(e => { e.textContent = S.coins; });
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
  let modalBack = null;   // what the Android back button / backdrop tap does while a modal is open
  function openModal(html, onBack) {
    $('#sheet').innerHTML = html;
    $('#modal').hidden = false;
    modalBack = onBack === undefined ? closeModal : onBack;
    const x = $('#sheet .close-x');
    if (x) x.addEventListener('click', () => modalBack && modalBack());
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#sheet').innerHTML = '';
    modalBack = null;
  }
  function on(q, fn) {
    const el = $('#sheet ' + q);
    if (el) el.addEventListener('click', fn);
  }
  const coinPrice = n => `<i class="coin" style="width:15px;height:15px"></i><b>${n}</b>`;
  const closeX = '<button class="close-x chunky red">✕</button>';

  function starsFor(moves, par) {
    if (moves <= par) return 3;
    if (moves <= Math.ceil(par * 1.3)) return 2;
    return 1;
  }

  function win() {
    clearHint();
    const first = G.level >= S.maxLevel;
    const stars = starsFor(G.moves, G.par);
    S.stars[G.level] = Math.max(S.stars[G.level] || 0, stars);
    let earned = 0;
    if (first) {
      earned = WIN_COINS + (stars === 3 ? BONUS_COINS : 0);
      S.coins += earned;
      S.maxLevel = G.level + 1;
    }
    const done = G.level, moves = G.moves;
    const eggDue = first && pendingEggs() > 0;
    S.game = null;
    persist();
    sfx('win'); buzz([40, 60, 40]); confetti();
    hud();
    if (first) bumpCoins();

    const next = () => {
      closeModal();
      if (eggDue) hatch(() => startLevel(S.maxLevel));
      else startLevel(S.maxLevel);
    };
    const home = () => { closeModal(); showHome(); };
    const starHtml = [1, 2, 3].map(k => `<span class="${k <= stars ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.18}s">★</span>`).join('');
    openModal(`
      <div class="ribbon gold">כל הכבוד!</div>
      <div class="stars">${starHtml}</div>
      <p class="center">שלב ${done} הושלם ב-${moves} מהלכים</p>
      ${first ? `<div class="win-coins">+${earned} <i class="coin"></i></div>
        <p class="center muted">${stars === 3 ? 'כולל בונוס ' + BONUS_COINS + ' על פתרון מושלם' : 'פתרון ב-' + G.par + ' מהלכים או פחות = 3 כוכבים ובונוס'}</p>`
        : '<p class="center muted">שלב שכבר נפתר בעבר אינו מזכה במטבעות</p>'}
      ${eggDue ? '<p class="center" style="color:#ffe08a;font-weight:800">🥚 ביצה חדשה מחכה לך!</p>' : ''}
      <div class="btn-row" style="margin-top:6px">
        <button class="chunky green wide" id="mNext" style="flex:2">${eggDue ? 'לבקוע את הביצה' : first ? 'לשלב הבא' : 'חזרה לשלב ' + S.maxLevel}</button>
        <button class="chunky purple wide" id="mHome">בית</button>
      </div>`, next);
    on('#mNext', next);
    on('#mHome', home);
  }

  function stuck() {
    if (G.won || !$('#modal').hidden) return;
    openModal(`
      <div class="ribbon">אין יותר מהלכים</div>
      ${closeX}
      <p class="center">אפשר לבטל מהלך, להוסיף מבחנה או להתחיל את השלב מחדש.</p>
      <button class="chunky blue wide" id="mUndo">ביטול מהלך &nbsp;${coinPrice(price('undo'))}</button>
      ${G.extra ? '' : `<button class="chunky blue wide" id="mTube">הוספת מבחנה &nbsp;${coinPrice(BASE.tube)}</button>`}
      <button class="chunky green wide" id="mRestart">התחלה מחדש</button>`);
    on('#mUndo', () => { closeModal(); undo(); });
    on('#mTube', () => { closeModal(); addTube(); });
    on('#mRestart', () => { closeModal(); restartLevel(); });
  }

  function confirmRestart() {
    if (!G.moves) { restartLevel(); return; }
    openModal(`
      <div class="ribbon">להתחיל מחדש?</div>
      <p class="center">השלב יחזור למצב ההתחלתי.${G.extra ? ' המבחנה שנוספה תישאר.' : ''}</p>
      <div class="btn-row"><button class="chunky green wide" id="mYes">כן, מחדש</button><button class="chunky purple wide" id="mNo">לא</button></div>`);
    on('#mYes', () => { closeModal(); restartLevel(); });
    on('#mNo', closeModal);
  }

  // ---------- eggs ----------
  const CRACKS = `<svg class="cracks" viewBox="0 0 100 128"><path d="M50 18 L44 34 L54 44 L42 58 L52 70 M44 34 L34 40 M54 44 L66 50 L60 62" stroke="#3d2a14" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function hatch(after) {
    const n = S.eggs + 1;
    const def = Cat.eggDef(n);
    const rar = Cat.RARITY[def.rarity];
    const rewards = Cat.eggRewards(n);
    S.eggs = n;
    S.coins += rar.coins;
    rewards.forEach(r => { const k = r.kind + ':' + r.item.id; if (!S.owned.includes(k)) S.owned.push(k); });
    persist();

    const KIND = { bg: 'רקע חדש', tube: 'מבחנה חדשה', skin: 'כדורים חדשים' };
    const rewardHtml = [`+${rar.coins} מטבעות`].concat(rewards.map(r => `${KIND[r.kind]}: ${r.item.name}`)).join('<br>');
    const done = () => {
      closeModal();
      $$('.coinVal').forEach(e => { e.textContent = S.coins; });
      if (pendingEggs() > 0) hatch(after);
      else if (after) after();
      else refreshHome();
    };
    openModal(`
      <div class="ribbon gold">ביצה חדשה!</div>
      <div class="hatch" id="hatch">
        <div class="hatch-stage"><div class="rays"></div>
          <div class="hatch-egg shake" id="hEgg"><img id="hImg" src="${Gfx.eggArt(MYSTERY, 132, 9)}" alt="">${CRACKS}</div>
        </div>
        <div class="hatch-info">
          <div class="rarity" style="color:${rar.color}">${rar.name}</div>
          <div class="egg-name">${def.name}</div>
          <div class="reward">${rewardHtml}</div>
        </div>
        <button class="chunky gold wide" id="mCollect" style="visibility:hidden">אסוף</button>
      </div>`, null);
    sfx('crack');
    setTimeout(() => { sfx('crack'); buzz(20); }, 500);
    setTimeout(() => { const e = $('#hEgg'); if (e) e.classList.add('cracked'); sfx('crack'); buzz(30); }, 1000);
    setTimeout(() => {
      const e = $('#hEgg');
      if (!e) return;
      const fl = document.createElement('div');
      fl.className = 'flash';
      document.body.appendChild(fl);
      setTimeout(() => fl.remove(), 750);
      $('#hImg').src = Gfx.eggArt(def, 132, n);
      e.classList.remove('shake', 'cracked');
      e.classList.add('reveal');
      $('#hatch').classList.add('open');
      $('#mCollect').style.visibility = 'visible';
      sfx('hatch'); buzz([30, 40, 60]);
      confetti();
      bumpCoins();
      modalBack = done;
    }, 1550);
    on('#mCollect', done);
  }

  // ---------- collection ----------
  let colTab = 'eggs', pendingBuy = null;
  function collection(tab) {
    if (tab) colTab = tab;
    const TABS = [['eggs', 'ביצים'], ['bg', 'רקעים'], ['tube', 'מבחנות'], ['skin', 'כדורים']];
    let body = '';
    if (colTab === 'eggs') {
      const total = Cat.EGGS.length;
      body = `<p class="center muted" style="margin-bottom:10px">נאספו ${Math.min(S.eggs, total)} מתוך ${total} · ביצה חדשה כל ${Cat.LEVELS_PER_EGG} שלבים</p><div class="grid">`;
      Cat.EGGS.forEach((def, i) => {
        const n = i + 1, have = n <= S.eggs;
        const rar = Cat.RARITY[def.rarity];
        body += `<div class="card"><div class="thumb"><img class="egg${have ? '' : ' locked'}" src="${Gfx.eggArt(have ? def : MYSTERY, 60, have ? n : 9)}" alt="">${have ? '' : '<span class="q">?</span>'}</div>
          <div class="name">${have ? def.name : '???'}</div>
          ${have ? `<div class="rar" style="color:${rar.color}">${rar.name}</div>` : `<div class="lock">שלב ${n * Cat.LEVELS_PER_EGG}</div>`}</div>`;
      });
      if (S.eggs > total) {
        body += `<div class="card"><div class="thumb"><img class="egg" src="${Gfx.eggArt(Cat.GOLD_EGG, 60, 99)}" alt=""></div><div class="name">${Cat.GOLD_EGG.name}</div><div class="rar" style="color:#ffc83d">×${S.eggs - total}</div></div>`;
      }
      body += '</div>';
    } else {
      body = '<div class="grid">';
      for (const it of Cat.ITEMS[colTab]) {
        const key = colTab + ':' + it.id;
        const have = owned(colTab, it);
        const selected = S[colTab] === it.id;
        let action;
        if (selected) action = '<button class="chunky gold" disabled>נבחר ✓</button>';
        else if (have) action = `<button class="chunky green" data-pick="${key}">בחירה</button>`;
        else if (it.egg) action = `<div class="lock">🔒 ביצה בשלב ${it.egg * Cat.LEVELS_PER_EGG}</div>`;
        else if (pendingBuy === key) action = `<button class="chunky red" data-buy="${key}">לקנות?</button>`;
        else action = `<button class="chunky blue" data-buy="${key}">${coinPrice(it.price)}</button>`;
        body += `<div class="card${selected ? ' sel' : ''}">${thumb(colTab, it)}<div class="name">${it.name}</div>${action}</div>`;
      }
      body += '</div>';
    }
    openModal(`
      <div class="ribbon">אוסף</div>
      ${closeX}
      <div class="tabs">${TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === colTab ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="scroll" id="colBody">${body}</div>
      <p class="center muted" style="margin:10px 0 0">יש לך <b>${S.coins}</b> מטבעות</p>`, () => { pendingBuy = null; closeModal(); afterThemeChange(); });
    $('#sheet .tabs').addEventListener('click', e => {
      const t = e.target.dataset.tab;
      if (t) { pendingBuy = null; collection(t); }
    });
    on('#colBody', collectionClick);
  }
  function thumb(kind, it) {
    if (kind === 'bg') return `<div class="thumb scene">${Gfx.scene(it.id)}</div>`;
    if (kind === 'skin') {
      return `<div class="thumb balls">${[0, 5, 2, 7, 3, 8].map(c => `<img src="${Gfx.ballSprite(it.id, c, 26)}" alt="">`).join('')}</div>`;
    }
    const balls = [6, 6, 0].map((c, j) => `<img src="${Gfx.ballSprite(S.skin, c, 20)}" style="position:absolute;width:20px;height:20px;left:4px;bottom:${4 + j * 20}px" alt="">`).join('');
    return `<div class="thumb tubes"><div style="position:relative;width:28px;height:80px">${Gfx.tubeSVG(it.id, 28, 80)}${balls}</div></div>`;
  }
  function collectionClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const key = b.dataset.pick || b.dataset.buy;
    if (!key) return;
    const [kind, id] = key.split(':');
    if (b.dataset.buy) {
      if (pendingBuy !== key) { pendingBuy = key; collection(); return; }
      pendingBuy = null;
      const it = Cat.findItem(kind, id);
      if (!spend(it.price)) { collection(); return; }
      S.owned.push(key);
      sfx('coin');
    }
    S[kind] = id;
    persist();
    if (kind === 'bg') applyTheme();
    collection();
  }
  function afterThemeChange() {
    if (screen === 'game' && G) { render(); hud(); } else refreshHome();
  }

  // ---------- levels, settings, help ----------
  function levels() {
    let cells = '';
    const cur = S.game && !S.game.won ? S.game.level : S.maxLevel;
    for (let n = 1; n <= S.maxLevel; n++) {
      const st = S.stars[n] || 0;
      cells += `<button data-n="${n}" class="${n === cur ? 'cur' : ''}">${n}<small>${n < S.maxLevel ? '★'.repeat(st) : ''}</small></button>`;
    }
    openModal(`
      <div class="ribbon">בחירת שלב</div>
      ${closeX}
      <p class="center muted">אפשר לחזור לכל שלב שכבר נפתר</p>
      <div class="scroll"><div class="levels">${cells}</div></div>`);
    $('#sheet .levels').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const n = +btn.dataset.n;
      closeModal();
      if (S.game && !S.game.won && S.game.level === n) { G = S.game; showGame(); render(true); hud(); }
      else startLevel(n);
    });
    const c = $('#sheet .levels .cur') || $('#sheet .levels button:last-child');
    if (c) c.scrollIntoView({ block: 'center' });
  }

  function settings() {
    const tg = v => `<span class="toggle${v ? ' on' : ''}"></span>`;
    openModal(`
      <div class="ribbon">הגדרות</div>
      ${closeX}
      <button class="chunky blue wide menu-item" id="mSound">צלילים ${tg(S.settings.sound)}</button>
      <button class="chunky blue wide menu-item" id="mVib">רטט ${tg(S.settings.vibrate)}</button>
      <button class="chunky purple wide" id="mHelp">איך משחקים</button>`);
    on('#mSound', () => { S.settings.sound = !S.settings.sound; persist(); settings(); });
    on('#mVib', () => { S.settings.vibrate = !S.settings.vibrate; persist(); if (S.settings.vibrate) buzz(40); settings(); });
    on('#mHelp', () => help(settings));
  }

  function help(back) {
    const done = () => { S.seenHelp = true; persist(); if (back) back(); else closeModal(); };
    openModal(`
      <div class="ribbon">איך משחקים</div>
      <div class="scroll">
      <p>המטרה: לסדר את הכדורים כך שבכל מבחנה יהיו רק כדורים בצבע אחד.</p>
      <p>הקש על מבחנה כדי להרים את הכדור העליון, ואז הקש על מבחנה אחרת כדי להניח אותו שם. אפשר להניח כדור רק במבחנה ריקה, או על כדור באותו צבע כשיש מקום.</p>
      <p>על כל שלב מקבלים ${WIN_COINS} מטבעות, ועוד ${BONUS_COINS} על פתרון מושלם (3 כוכבים). במטבעות קונים ביטול מהלך, רמז, מבחנה נוספת ועיצובים.</p>
      <p>כל ${Cat.LEVELS_PER_EGG} שלבים בוקעת ביצה חדשה לאוסף. חלק מהביצים פותחות רקעים, מבחנות וסגנונות כדורים חדשים.</p>
      <p class="muted">מחיר הביטול והרמז מוכפל בכל שימוש וחוזר להתחלה בכל שלב חדש. מבחנה נוספת אפשר לקנות פעם אחת בשלב.</p>
      </div>
      <button class="chunky green wide" id="mOk">${back ? 'חזרה' : 'מתחילים!'}</button>`, done);
    on('#mOk', done);
  }

  function confetti() {
    const cols = Gfx.COLORS;
    for (let i = 0; i < 50; i++) {
      const d = document.createElement('div');
      d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = cols[i % cols.length];
      d.style.animationDuration = (1.5 + Math.random() * 1.4) + 's';
      d.style.animationDelay = Math.random() * 0.4 + 's';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 3500);
    }
  }

  // ---------- wiring ----------
  $('#btnRestart').addEventListener('click', confirmRestart);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnHint').addEventListener('click', hint);
  $('#btnTube').addEventListener('click', addTube);
  $('#homeBtn').addEventListener('click', showHome);
  $('#hSettings').addEventListener('click', settings);
  $('#hCollection').addEventListener('click', () => collection());
  $('#hLevels').addEventListener('click', levels);
  $('#eggCard').addEventListener('click', () => { if (pendingEggs() > 0) hatch(null); });
  $('#playBtn').addEventListener('click', () => {
    if (S.game && !S.game.won && S.game.level <= S.maxLevel) {
      G = S.game; sel = null;
      showGame(); render(true); hud();
    } else startLevel(S.maxLevel);
  });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalBack) modalBack(); });
  document.addEventListener('contextmenu', e => e.preventDefault());
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (G && screen === 'game') render(); }, 80);
  });

  // Called by the Android wrapper on the system back button; true = handled here.
  window.onAndroidBack = function () {
    if (!$('#modal').hidden) { if (modalBack) modalBack(); return true; }
    if (screen === 'game') {
      if (sel !== null) { finishAnims(); dropBack(); return true; }
      showHome();
      return true;
    }
    return false;
  };

  applyTheme();
  showHome();
  if (!S.seenHelp) help();
})();
