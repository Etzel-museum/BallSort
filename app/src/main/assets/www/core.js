// Pure game logic: level generation, rules and solver. No DOM here.
// A tube is an array of color indices, bottom → top.
(function (root) {
  'use strict';

  const CAP = 4;

  // Small deterministic PRNG, so level N is identical on every device and every time.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // [first level, number of colors]
  // Steeper curve since v2.0 (moves now carry whole runs, which makes each board easier):
  // 12 colours by level 121, the 18-colour ceiling by level 601.
  const COLOR_STEPS = [[1, 3], [3, 4], [5, 5], [9, 6], [16, 7], [26, 8], [41, 9], [61, 10], [86, 11], [121, 12],
                       [171, 13], [231, 14], [301, 15], [381, 16], [481, 17], [601, 18]];

  function levelInfo(n) {
    let colors = 3;
    for (const [from, k] of COLOR_STEPS) if (n >= from) colors = k;
    // An occasional easier "breather" level once things get going.
    if (n > 20 && n % 10 === 3) colors -= 1;
    return {
      colors,
      hard: n >= 10 && n % 10 === 0,
      hidden: n >= 25 && n % 10 === 5,
    };
  }

  function isComplete(t, cap) {
    if (t.length !== cap) return false;
    for (let i = 1; i < t.length; i++) if (t[i] !== t[0]) return false;
    return true;
  }

  function canMove(tubes, from, to, cap) {
    if (from === to) return false;
    const s = tubes[from], d = tubes[to];
    if (!s.length || d.length >= cap) return false;
    return !d.length || d[d.length - 1] === s[s.length - 1];
  }

  // How many same-coloured balls sit together on top of the tube.
  function topRun(t) {
    let r = 0;
    while (r < t.length && t[t.length - 1 - r] === t[t.length - 1]) r++;
    return r;
  }

  // A move carries the whole same-coloured run from the top, as many balls as fit.
  function moveCount(tubes, from, to, cap) {
    if (!canMove(tubes, from, to, cap)) return 0;
    return Math.min(topRun(tubes[from]), cap - tubes[to].length);
  }

  function isSolved(tubes, cap) {
    return tubes.every(t => t.length === 0 || isComplete(t, cap));
  }

  function hasAnyMove(tubes, cap) {
    for (let f = 0; f < tubes.length; f++) {
      if (!tubes[f].length || isComplete(tubes[f], cap)) continue;
      for (let t = 0; t < tubes.length; t++) if (canMove(tubes, f, t, cap)) return true;
    }
    return false;
  }

  // ---------- Solver: weighted A* over run moves (see moveCount) ----------
  // State = array of strings, one char per ball. Tube order is kept (so moves map back
  // to real tube indices) but the visited-set key is order-independent.

  function heuristic(st) {
    let h = 0;
    const runs = {};
    for (const t of st) {
      if (!t.length) continue;
      let r = 1;
      while (r < t.length && t[r] === t[0]) r++;
      h += t.length - r;                 // balls stacked on a foreign base must move
      const c = t[0];
      if (runs[c]) { h += Math.min(r, runs[c]); runs[c] = Math.max(r, runs[c]); }
      else runs[c] = r;
    }
    return h;
  }

  function homogeneous(t) {
    for (let i = 1; i < t.length; i++) if (t[i] !== t[0]) return false;
    return true;
  }

  function solve(tubes, cap, maxNodes) {
    maxNodes = maxNodes || 150000;
    const start = tubes.map(t => t.map(c => String.fromCharCode(97 + c)).join(''));
    const keyOf = st => st.slice().sort().join('|');
    const W = 2;

    // binary min-heap on f
    const heap = [];
    const push = n => {
      heap.push(n);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].f <= n.f) break;
        heap[i] = heap[p]; i = p;
      }
      heap[i] = n;
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i, mf = last.f;
          if (l < heap.length && heap[l].f < mf) { m = l; mf = heap[l].f; }
          if (r < heap.length && heap[r].f < mf) { m = r; }
          if (m === i) break;
          heap[i] = heap[m]; i = m;
        }
        heap[i] = last;
      }
      return top;
    };

    const seen = new Map();
    push({ st: start, g: 0, f: W * heuristic(start), parent: null, move: null });
    seen.set(keyOf(start), 0);
    let nodes = 0;

    while (heap.length) {
      const node = pop();
      const st = node.st;
      if (st.every(t => !t.length || (t.length === cap && homogeneous(t)))) {
        const moves = [];
        for (let n = node; n.parent; n = n.parent) moves.push(n.move);
        moves.reverse();
        return { moves, nodes };
      }
      if (++nodes > maxNodes) return null;

      let firstEmpty = -1;
      for (let i = 0; i < st.length; i++) if (!st[i].length) { firstEmpty = i; break; }

      for (let f = 0; f < st.length; f++) {
        const s = st[f];
        if (!s.length) continue;
        const sHomo = homogeneous(s);
        if (sHomo && s.length === cap) continue;
        const ball = s[s.length - 1];
        let run = 1;
        while (run < s.length && s[s.length - 1 - run] === ball) run++;
        for (let t = 0; t < st.length; t++) {
          if (t === f) continue;
          const d = st[t];
          if (!d.length) {
            if (t !== firstEmpty || sHomo) continue;
          } else if (d.length >= cap || d[d.length - 1] !== ball) continue;
          const cnt = Math.min(run, cap - d.length);
          const next = st.slice();
          next[f] = s.slice(0, -cnt);
          next[t] = d + ball.repeat(cnt);
          const k = keyOf(next);
          const g = node.g + 1;
          const prev = seen.get(k);
          if (prev !== undefined && prev <= g) continue;
          seen.set(k, g);
          push({ st: next, g, f: g + W * heuristic(next), parent: node, move: [f, t] });
        }
      }
    }
    return null;
  }

  // ---------- Level generation ----------

  function generateLevel(n) {
    const info = levelInfo(n);
    const k = info.colors, empties = 2;
    const rng = mulberry32((n * 2654435761) ^ 0x5bd1e995);
    // Hard levels: hardest of 3 solvable candidates (2 on the biggest boards, to keep generation quick).
    const wanted = info.hard ? (k >= 15 ? 2 : 3) : 1;
    let best = null, found = 0;

    for (let attempt = 0; attempt < 200 && found < wanted; attempt++) {
      const balls = [];
      for (let c = 0; c < k; c++) for (let i = 0; i < CAP; i++) balls.push(c);
      for (let i = balls.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [balls[i], balls[j]] = [balls[j], balls[i]];
      }
      const tubes = [];
      for (let i = 0; i < k; i++) tubes.push(balls.slice(i * CAP, i * CAP + CAP));
      for (let i = 0; i < empties; i++) tubes.push([]);
      // Reject boards that start with a finished tube or three-in-a-row on top.
      if (tubes.some(t => t.length && (isComplete(t, CAP) || (t[3] === t[2] && t[2] === t[1])))) continue;

      const sol = solve(tubes, CAP, 200000);
      if (!sol) continue;
      found++;
      if (!best || sol.nodes > best.nodes) best = { tubes, par: sol.moves.length, nodes: sol.nodes };
    }

    return { level: n, cap: CAP, colors: k, hard: info.hard, hidden: info.hidden, tubes: best.tubes, par: best.par };
  }

  const api = { CAP, levelInfo, generateLevel, solve, canMove, moveCount, topRun, isComplete, isSolved, hasAnyMove, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(this);
