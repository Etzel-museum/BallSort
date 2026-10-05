// All drawing: ball/egg sprites (canvas → cached data URLs), tube SVGs and background scenes.
// Nothing here is a bitmap asset; everything is generated, so the APK stays tiny.
(function (root) {
  'use strict';

  const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#9ccc65', '#2e7d32', '#4fc3f7',
                  '#1e40af', '#8e24aa', '#f06292', '#795548', '#9e9e9e', '#f5f5f5',
                  '#00897b', '#ad1457', '#b39ddb', '#37474f', '#ffcc80', '#827717'];
  const LIGHT = new Set([2, 3, 5, 10, 11, 14, 16]);
  const VS = '︎';
  const SYMBOLS = ['●', '▲', '■', '★' + VS, '♥' + VS, '◆', '✚', '✖' + VS, '♣' + VS,
                   '♠' + VS, '☀' + VS, '♪' + VS, '☾' + VS, '✿' + VS, '⬢', '▼', '✦', '♦' + VS];
  // Per-colour egg pattern, so in egg mode colour AND pattern tell eggs apart.
  const EGG_PATTERNS = ['spots', 'zigzag', 'dots', 'vstripes', 'stripes', 'waves', 'scales', 'stars',
                        'diamonds', 'swirl', 'dots', 'waves', 'zigzag', 'stripes', 'scales', 'stars', 'vstripes', 'diamonds'];

  const rng = seed => root.Core.mulberry32(seed);

  // ---------- colour helpers ----------
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // t > 0 lightens towards white, t < 0 darkens towards black.
  function tone(hex, t, a) {
    const f = c => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
    const [r, g, b] = rgb(hex);
    return `rgba(${f(r)},${f(g)},${f(b)},${a === undefined ? 1 : a})`;
  }

  // ---------- shared shading ----------
  function shade(ctx, cx, cy, rx, ry) {
    let g = ctx.createRadialGradient(cx - rx * 0.25, cy - ry * 0.25, rx * 0.45, cx, cy, Math.max(rx, ry) * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
    g = ctx.createRadialGradient(cx - rx * 0.32, cy - ry * 0.42, 0, cx - rx * 0.32, cy - ry * 0.42, rx * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.36, cy - ry * 0.5, rx * 0.2, ry * 0.11, -0.55, 0, Math.PI * 2);
    ctx.fill();
    g = ctx.createRadialGradient(cx + rx * 0.4, cy + ry * 0.5, 0, cx + rx * 0.4, cy + ry * 0.5, rx * 0.4);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
  }

  // ---------- balls ----------
  function marble(ctx, S, hex, seed) {
    const r = S / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(r, r, r * 0.96, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(r * 0.7, r * 0.6, r * 0.1, r, r, r);
    g.addColorStop(0, tone(hex, 0.35)); g.addColorStop(0.55, hex); g.addColorStop(1, tone(hex, -0.45));
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    const R = rng(seed);
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const y = S * (0.12 + R() * 0.76);
      ctx.beginPath();
      ctx.moveTo(-S * 0.1, y);
      ctx.bezierCurveTo(S * 0.3, y + (R() - 0.5) * S * 0.8, S * 0.7, y + (R() - 0.5) * S * 0.8, S * 1.1, y + (R() - 0.5) * S * 0.4);
      ctx.lineWidth = S * (0.03 + R() * 0.07);
      ctx.strokeStyle = i % 2 ? `rgba(255,255,255,${0.1 + R() * 0.14})` : tone(hex, -0.5, 0.22);
      ctx.stroke();
    }
    shade(ctx, r, r, r, r);
    ctx.restore();
  }

  function flat(ctx, S, hex) {
    const r = S / 2;
    ctx.fillStyle = hex;
    ctx.beginPath(); ctx.arc(r, r, r * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = S * 0.04; ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.stroke();
  }

  function gem(ctx, S, hex) {
    const r = S / 2, n = 8, pts = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI / n + i * 2 * Math.PI / n;
      pts.push([r + Math.cos(a) * r * 0.97, r + Math.sin(a) * r * 0.97]);
    }
    ctx.fillStyle = hex;
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)';
      if (i === 5 || i === 6) ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.beginPath(); ctx.moveTo(r, r); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = tone(hex, 0.3, 0.9);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pts[i], x = r + (p[0] - r) * 0.45, y = r + (p[1] - r) * 0.45;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(r * 0.7, r * 0.62, r * 0.16, r * 0.08, -0.6, 0, Math.PI * 2); ctx.fill();
  }

  function glyph(ctx, S, text, dark) {
    ctx.font = `bold ${Math.round(S * 0.46)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = S * 0.05;
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.95)';
    ctx.fillText(text, S / 2, S * 0.53);
    ctx.shadowBlur = 0;
  }

  // ---------- eggs ----------
  function eggPath(ctx, cx, cy, w, h) {
    const hw = w / 2, ry = h / 2, N = 56;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const u = -Math.cos(t);                       // -1 top … 1 bottom
      const x = cx + hw * Math.sin(t) * (1 + 0.12 * u) / 1.06;
      const y = cy + ry * u;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function eggPattern(ctx, cx, cy, w, h, accent, pattern, seed, extra) {
    const R = rng(seed);
    const top = cy - h / 2;
    ctx.fillStyle = accent; ctx.strokeStyle = accent; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (pattern) {
      case 'stripes':
        for (let k = 0; k < 3; k++) ctx.fillRect(cx - w, top + h * (0.3 + k * 0.2), w * 2, h * 0.08);
        break;
      case 'vstripes':
        ctx.lineWidth = w * 0.09;
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath(); ctx.moveTo(cx + k * w * 0.08, top);
          ctx.quadraticCurveTo(cx + k * w * 0.42, cy, cx + k * w * 0.1, top + h); ctx.stroke();
        }
        break;
      case 'waves':
        ctx.lineWidth = h * 0.07;
        for (let k = 0; k < 3; k++) {
          const y0 = top + h * (0.3 + k * 0.22);
          ctx.beginPath();
          for (let x = -w; x <= w; x += w * 0.05) {
            const y = y0 + Math.sin((x / w) * Math.PI * 3 + k) * h * 0.045;
            x === -w ? ctx.moveTo(cx + x, y) : ctx.lineTo(cx + x, y);
          }
          ctx.stroke();
        }
        break;
      case 'zigzag':
        ctx.lineWidth = h * 0.065;
        for (let k = 0; k < 2; k++) {
          const y0 = top + h * (0.4 + k * 0.25), step = w * 0.16;
          ctx.beginPath();
          for (let i = 0, x = cx - w; x <= cx + w; x += step, i++) {
            const y = y0 + (i % 2 ? -1 : 1) * h * 0.05;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        break;
      case 'dots':
        for (let row = 0; row < 6; row++) {
          for (let col = -3; col <= 3; col++) {
            const x = cx + col * w * 0.24 + (row % 2) * w * 0.12, y = top + h * (0.14 + row * 0.15);
            ctx.beginPath(); ctx.arc(x, y, w * 0.065, 0, Math.PI * 2); ctx.fill();
          }
        }
        break;
      case 'spots':
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          ctx.ellipse(cx + (R() - 0.5) * w, top + h * (0.1 + R() * 0.85), w * (0.05 + R() * 0.09), w * (0.04 + R() * 0.07), R() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'scales':
        ctx.lineWidth = w * 0.05;
        for (let row = 0; row < 5; row++) {
          for (let col = -3; col <= 3; col++) {
            const x = cx + col * w * 0.22 + (row % 2) * w * 0.11, y = top + h * (0.25 + row * 0.15);
            ctx.beginPath(); ctx.arc(x, y, w * 0.11, 0, Math.PI); ctx.stroke();
          }
        }
        break;
      case 'diamonds': {
        const y = cy + h * 0.04, d = w * 0.12;
        for (let x = cx - w; x <= cx + w; x += d * 1.7) {
          ctx.beginPath(); ctx.moveTo(x, y - d); ctx.lineTo(x + d * 0.7, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d * 0.7, y); ctx.closePath(); ctx.fill();
        }
        ctx.fillRect(cx - w, y - d * 1.55, w * 2, h * 0.035);
        ctx.fillRect(cx - w, y + d * 1.35, w * 2, h * 0.035);
        break;
      }
      case 'stars':
        for (let i = 0; i < 7; i++) {
          const x = cx + (R() - 0.5) * w * 0.85, y = top + h * (0.15 + R() * 0.75), s = w * (0.07 + R() * 0.05);
          ctx.beginPath();
          for (let k = 0; k < 10; k++) {
            const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? s * 0.45 : s;
            k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          ctx.closePath(); ctx.fill();
        }
        break;
      case 'swirl':
        ctx.lineWidth = w * 0.07;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(cx - w, top + h * (0.2 + k * 0.2));
          ctx.bezierCurveTo(cx - w * 0.2, top + h * (0.05 + k * 0.2), cx + w * 0.2, top + h * (0.45 + k * 0.2), cx + w, top + h * (0.25 + k * 0.2));
          ctx.stroke();
        }
        break;
      case 'bands': {
        const cols = extra || ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
        const bh = h / cols.length;
        cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(cx - w, top + i * bh, w * 2, bh + 1); });
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = h * 0.025;
        for (let i = 1; i < cols.length; i++) {
          ctx.beginPath();
          for (let x = -w; x <= w; x += w * 0.05) {
            const y = top + i * bh + Math.sin((x / w) * Math.PI * 4) * h * 0.02;
            x === -w ? ctx.moveTo(cx + x, y) : ctx.lineTo(cx + x, y);
          }
          ctx.stroke();
        }
        break;
      }
      case 'flames':
        for (let i = -3; i <= 3; i++) {
          const x = cx + i * w * 0.2, base = top + h * 0.95;
          ctx.beginPath(); ctx.moveTo(x - w * 0.1, base);
          ctx.quadraticCurveTo(x - w * 0.1, top + h * 0.5, x + (i % 2 ? 1 : -1) * w * 0.02, top + h * (0.25 + (i & 1) * 0.12));
          ctx.quadraticCurveTo(x + w * 0.12, top + h * 0.55, x + w * 0.1, base); ctx.fill();
        }
        break;
    }
  }

  function drawEgg(ctx, cx, cy, w, h, base, accent, pattern, seed, extra) {
    ctx.save();
    eggPath(ctx, cx, cy, w, h);
    ctx.clip();
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, tone(base, 0.18)); g.addColorStop(1, tone(base, -0.18));
    ctx.fillStyle = g; ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
    if (pattern) eggPattern(ctx, cx, cy, w, h, accent, pattern, seed, extra);
    shade(ctx, cx, cy, w / 2, h / 2);
    ctx.restore();
  }

  // ---------- sprite cache ----------
  const cache = new Map();
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    return c;
  }

  // skin: glossy | flat | symbols | gems | eggs ; color -1 = hidden "?" ball
  function ballSprite(skin, color, size) {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const S = Math.max(8, Math.round(size * dpr));
    const key = skin + '|' + color + '|' + S;
    let url = cache.get(key);
    if (url) return url;
    const c = canvas(S, S), ctx = c.getContext('2d');
    const hidden = color < 0;
    const hex = hidden ? '#5f6b80' : COLORS[color];
    if (skin === 'eggs') {
      const accent = LIGHT.has(color) ? tone(hex, -0.38) : tone(hex, 0.5);
      drawEgg(ctx, S / 2, S / 2, S * 0.78, S * 0.97, hex, accent, hidden ? null : EGG_PATTERNS[color], 1000 + color);
    } else if (skin === 'flat' && !hidden) flat(ctx, S, hex);
    else if (skin === 'gems' && !hidden) gem(ctx, S, hex);
    else marble(ctx, S, hex, 77 + Math.max(0, color) * 13);
    if (hidden) glyph(ctx, S, '?', false);
    else if (skin === 'symbols') glyph(ctx, S, SYMBOLS[color], LIGHT.has(color));
    url = c.toDataURL();
    cache.set(key, url);
    return url;
  }

  // Collection egg artwork. def: {base, accent, pattern, colors?}
  function eggArt(def, size, seed) {
    const key = 'egg|' + def.name + '|' + size;
    let url = cache.get(key);
    if (url) return url;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = size * dpr, H = size * 1.28 * dpr;
    const c = canvas(W, H), ctx = c.getContext('2d');
    drawEgg(ctx, W / 2, H / 2, W * 0.86, H * 0.96, def.base, def.accent, def.pattern, seed || 5, def.colors);
    url = c.toDataURL();
    cache.set(key, url);
    return url;
  }

  // ---------- tubes ----------
  let uid = 0;
  const TUBES = ['classic', 'bottle', 'spiral', 'gold'];

  function tubeSVG(style, w, h) {
    const id = 't' + (++uid);
    const sw = Math.max(2, w * 0.055);
    const r = (w - sw) / 2;
    const x0 = sw / 2, x1 = w - sw / 2;
    const gold = style === 'gold';
    const stroke = gold ? `url(#${id}g)` : 'currentColor';
    let outline;
    if (style === 'bottle') {
      const amp = w * 0.07, waves = 2, pts = [];
      const yEnd = h - r;
      for (let i = 0; i <= 24; i++) {
        const y = sw + (yEnd - sw) * i / 24;
        pts.push([x0 - Math.abs(Math.sin((i / 24) * Math.PI * waves)) * amp, y]);   // bulge outwards only
      }
      const left = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      outline =`${left} A${r},${r} 0 0 0 ${x1},${yEnd} ` + pts.slice(0, -1).reverse().map(p => 'L' + (w - p[0]).toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    } else {
      outline = `M${x0},${sw} V${h - r} A${r},${r} 0 0 0 ${x1},${h - r} V${sw}`;
    }
    let extra = '';
    if (style === 'spiral') {
      for (let y = h * 0.12; y < h - r * 0.6; y += w * 0.55) {
        extra += `<path d="M${x0 + 1},${y + w * 0.35} Q${w / 2},${y + w * 0.05} ${x1 - 1},${y}" stroke="currentColor" stroke-opacity=".35" stroke-width="${sw * 0.6}" fill="none"/>`;
      }
    }
    if (gold) {
      for (let y = h * 0.2; y < h - r; y += h * 0.22) {
        extra += `<path d="M${x0},${y} h${w * 0.18} M${x1},${y} h${-w * 0.18}" stroke="url(#${id}g)" stroke-width="${sw * 0.7}"/>`;
      }
    }
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;display:block">
      <defs>
        <linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#e2a92b"/><stop offset="1" stop-color="#8a5a00"/></linearGradient>
      </defs>
      <path d="${outline}" fill="url(#${id}f)" stroke="none"/>
      ${extra}
      <rect x="${w * 0.16}" y="${h * 0.08}" width="${Math.max(2, w * 0.09)}" height="${h * 0.68}" rx="${w * 0.05}" fill="#fff" fill-opacity=".2"/>
      <path d="${outline}" fill="none" stroke="${stroke}" stroke-opacity="${gold ? 1 : 0.75}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="${-sw * 0.9}" y="0" width="${w + sw * 1.8}" height="${sw * 1.7}" rx="${sw * 0.85}" fill="${stroke}" fill-opacity="${gold ? 1 : 0.85}"/>
    </svg>`;
  }

  // ---------- scenes ----------
  // Each scene is an SVG string, 400×800, drawn with "slice" so it covers any phone shape.
  const f1 = n => n.toFixed(1);

  function ridge(R, y, amp, seg, jag) {
    const pts = [];
    for (let i = 0; i <= seg; i++) pts.push([i * 400 / seg, y + (R() - 0.5) * amp]);
    let d = `M0,800 L0,${f1(pts[0][1])}`;
    if (jag) pts.forEach(p => { d += ` L${f1(p[0])},${f1(p[1])}`; });
    else for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      d += ` Q${f1(a[0] + (b[0] - a[0]) / 2)},${f1(Math.min(a[1], b[1]) - amp * 0.2)} ${f1(b[0])},${f1(b[1])}`;
    }
    return d + ' L400,800 Z';
  }
  function pines(R, y, count, size, color) {
    let s = '';
    for (let i = 0; i < count; i++) {
      const x = R() * 420 - 10, h = size * (0.6 + R() * 0.6), yy = y + R() * size * 0.3;
      s += `<path d="M${f1(x)},${f1(yy - h)} L${f1(x + h * 0.32)},${f1(yy)} L${f1(x - h * 0.32)},${f1(yy)} Z M${f1(x)},${f1(yy - h * 1.15)} L${f1(x + h * 0.22)},${f1(yy - h * 0.45)} L${f1(x - h * 0.22)},${f1(yy - h * 0.45)} Z" fill="${color}"/>`;
    }
    return s;
  }
  function stars(R, n, yMax, cls) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const tw = R() < 0.35;
      s += `<circle cx="${f1(R() * 400)}" cy="${f1(R() * yMax)}" r="${f1(0.5 + R() * 1.3)}" fill="#fff" opacity="${(0.35 + R() * 0.6).toFixed(2)}"${tw ? ` class="${cls || 'twinkle'}" style="animation-delay:${f1(R() * 4)}s"` : ''}/>`;
    }
    return s;
  }
  function grad(id, stops, vertical) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical === false ? 1 : 0}" y2="${vertical === false ? 0 : 1}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  }

  const SCENES = {
    night(id) {
      const R = rng(11);
      let fire = '';
      for (let i = 0; i < 14; i++) fire += `<circle class="firefly" cx="${f1(R() * 400)}" cy="${f1(560 + R() * 220)}" r="1.8" fill="#ffe98a" style="animation-delay:${f1(R() * 5)}s"/>`;
      return `<defs>${grad(id + 's', [[0, '#081430'], [0.55, '#15335a'], [1, '#1d4d5a']])}
        <radialGradient id="${id}m"><stop offset="0" stop-color="#fffbe0" stop-opacity=".35"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="800" fill="url(#${id}s)"/>${stars(R, 90, 520)}
        <circle cx="318" cy="110" r="75" fill="url(#${id}m)"/><circle cx="318" cy="110" r="26" fill="#f6f1d5"/>
        <circle cx="309" cy="104" r="5" fill="#e4dcb8"/><circle cx="326" cy="119" r="3.5" fill="#e4dcb8"/>
        <path d="${ridge(R, 560, 90, 9, true)}" fill="#1a3a4e"/>
        <path d="${ridge(R, 640, 40, 6)}" fill="#12303c"/>${pines(R, 650, 16, 60, '#12303c')}
        <path d="${ridge(R, 725, 30, 5)}" fill="#0a1d26"/>${pines(R, 735, 10, 95, '#0a1d26')}${fire}`;
    },
    canyon(id) {
      const R = rng(23);
      let mesas = '';
      [[540, '#a8452c', 0], [610, '#7a2f22', 1], [700, '#4a1c16', 2]].forEach(([y, c, k]) => {
        let d = 'M0,800 L0,' + y, x = 0;
        while (x < 400) {
          const w = 50 + R() * 90, top = y - (20 + R() * 90 - k * 10);
          d += ` L${f1(x + 8)},${f1(top)} L${f1(x + w - 8)},${f1(top)} L${f1(x + w)},${f1(y - R() * 10)}`;
          x += w + R() * 30;
        }
        mesas += `<path d="${d} L400,${y} L400,800 Z" fill="${c}"/>`;
      });
      let cacti = '';
      for (let i = 0; i < 4; i++) {
        const x = 20 + R() * 360, y = 760 + R() * 30;
        cacti += `<path d="M${f1(x)},${y} v-38 a5,5 0 0 1 10,0 v38 Z M${f1(x)},${y - 18} h-9 v-12 a3.5,3.5 0 0 1 7,0 v6 h2 Z" fill="#2b0f0b"/>`;
      }
      return `<defs>${grad(id + 's', [[0, '#2a1a3e'], [0.45, '#a94a3e'], [0.75, '#f2a65a']])}
        <radialGradient id="${id}g"><stop offset="0" stop-color="#ffd27a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="800" fill="url(#${id}s)"/>${stars(R, 30, 220)}
        <circle cx="140" cy="520" r="120" fill="url(#${id}g)"/><circle cx="140" cy="520" r="42" fill="#ffd98f"/>
        ${mesas}${cacti}`;
    },
    aurora(id) {
      const R = rng(37);
      let snow = '';
      for (let i = 0; i < 26; i++) snow += `<circle class="snow" cx="${f1(R() * 400)}" cy="${f1(-R() * 60)}" r="${f1(1 + R() * 1.6)}" fill="#fff" opacity=".7" style="animation-delay:${f1(-R() * 12)}s;animation-duration:${f1(9 + R() * 8)}s"/>`;
      const band = (y, c, k) => `<path class="sway" style="animation-delay:${k}s" d="M-40,${y} C60,${y - 90} 160,${y + 60} 240,${y - 30} S380,${y - 100} 460,${y - 40} L460,${y + 70} C360,${y + 10} 300,${y + 110} 200,${y + 60} S40,${y + 20} -40,${y + 90} Z" fill="url(#${id}${c})" filter="url(#${id}b)"/>`;
      return `<defs>${grad(id + 's', [[0, '#030a1a'], [0.6, '#0b2440'], [1, '#123a52']])}
        ${grad(id + 'a', [[0, '#3cf0a8', 0], [0.5, '#3cf0a8', 0.55], [1, '#3cf0a8', 0]])}
        ${grad(id + 'p', [[0, '#a86bff', 0], [0.5, '#a86bff', 0.45], [1, '#a86bff', 0]])}
        ${grad(id + 'c', [[0, '#5ad7ff', 0], [0.5, '#5ad7ff', 0.4], [1, '#5ad7ff', 0]])}
        ${grad(id + 'm', [[0, '#e8f4ff'], [0.35, '#9fbedb'], [1, '#294a6a']])}
        <filter id="${id}b" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>
        <rect width="400" height="800" fill="url(#${id}s)"/>${stars(R, 80, 600)}
        ${band(170, 'a', 0)}${band(250, 'p', -3)}${band(120, 'c', -6)}
        <path d="${ridge(R, 590, 140, 8, true)}" fill="url(#${id}m)"/>
        <path d="${ridge(R, 680, 40, 5)}" fill="#0d2236"/>${pines(R, 690, 14, 70, '#0d2236')}
        <path d="${ridge(R, 760, 20, 4)}" fill="#061423"/>${pines(R, 770, 8, 100, '#061423')}${snow}`;
    },
    sunset(id) {
      const R = rng(41);
      let refl = '';
      for (let i = 0; i < 12; i++) {
        const y = 478 + i * 14 + R() * 6, w = 110 - i * 7 + R() * 20;
        refl += `<rect class="shimmer" style="animation-delay:${f1(R() * 3)}s" x="${f1(200 - w / 2 + (R() - 0.5) * 20)}" y="${f1(y)}" width="${f1(w)}" height="3" rx="1.5" fill="#ffd98a" opacity="${(0.65 - i * 0.045).toFixed(2)}"/>`;
      }
      let birds = '';
      for (let i = 0; i < 5; i++) {
        const x = 60 + R() * 260, y = 150 + R() * 160, s = 6 + R() * 6;
        birds += `<path d="M${f1(x - s)},${f1(y)} q${f1(s / 2)},${f1(-s / 2)} ${f1(s)},0 q${f1(s / 2)},${f1(-s / 2)} ${f1(s)},0" stroke="#3a1f45" stroke-width="2" fill="none"/>`;
      }
      return `<defs>${grad(id + 's', [[0, '#2c1e4a'], [0.35, '#8e3b6e'], [0.52, '#f07a5a'], [0.6, '#ffc477']])}
        ${grad(id + 'w', [[0, '#7a3460'], [1, '#1f1033']])}
        <radialGradient id="${id}g"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".7"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="800" fill="url(#${id}s)"/>
        <circle cx="200" cy="455" r="150" fill="url(#${id}g)"/><circle cx="200" cy="455" r="58" fill="#ffd98a"/>
        <path d="M0,470 L40,455 L90,462 L130,448 L170,470 Z M260,470 L300,452 L340,458 L370,446 L400,456 L400,470 Z" fill="#3a1f45"/>
        <rect y="470" width="400" height="330" fill="url(#${id}w)"/>${refl}${birds}`;
    },
    ocean(id) {
      const R = rng(53);
      let rays = '', bubbles = '', weeds = '';
      for (let i = 0; i < 6; i++) {
        const x = R() * 400;
        rays += `<path d="M${f1(x)},0 L${f1(x + 40 + R() * 40)},0 L${f1(x + 140 + R() * 100)},800 L${f1(x + 40)},800 Z" fill="#fff" opacity="${(0.04 + R() * 0.05).toFixed(3)}"/>`;
      }
      for (let i = 0; i < 18; i++) bubbles += `<circle class="bubble" cx="${f1(R() * 400)}" cy="${f1(820 + R() * 100)}" r="${f1(2 + R() * 5)}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.2" style="animation-delay:${f1(-R() * 14)}s;animation-duration:${f1(9 + R() * 9)}s"/>`;
      for (let i = 0; i < 9; i++) {
        const x = R() * 400, h = 80 + R() * 140, c = R() < 0.5 ? '#0b4a3a' : '#0e5e45';
        weeds += `<path class="sway" style="animation-delay:${f1(-R() * 6)}s;transform-origin:${f1(x)}px 800px" d="M${f1(x)},800 C${f1(x - 20)},${f1(800 - h * 0.3)} ${f1(x + 20)},${f1(800 - h * 0.6)} ${f1(x)},${f1(800 - h)}" stroke="${c}" stroke-width="${f1(5 + R() * 5)}" stroke-linecap="round" fill="none"/>`;
      }
      return `<defs>${grad(id + 's', [[0, '#0d86ad'], [0.5, '#06456b'], [1, '#03213a']])}</defs>
        <rect width="400" height="800" fill="url(#${id}s)"/>${rays}${weeds}
        <path d="${ridge(R, 770, 25, 6)}" fill="#a68c5a"/><path d="${ridge(R, 790, 12, 5)}" fill="#c9ad74"/>${bubbles}`;
    },
    spring(id) {
      const R = rng(67);
      let clouds = '', flowers = '';
      for (let i = 0; i < 4; i++) {
        const x = R() * 400, y = 60 + R() * 220, s = 0.7 + R() * 0.7;
        clouds += `<g transform="translate(${f1(x)},${f1(y)}) scale(${s.toFixed(2)})"><g class="drift" style="animation-delay:${f1(-R() * 40)}s" fill="#fff" opacity=".92"><circle cx="0" cy="0" r="22"/><circle cx="24" cy="-10" r="28"/><circle cx="52" cy="0" r="20"/><rect x="-10" y="0" width="70" height="18" rx="9"/></g></g>`;
      }
      const fc = ['#ff6b8a', '#ffd23f', '#ffffff', '#c084fc', '#ff9f43'];
      for (let i = 0; i < 46; i++) flowers += `<circle cx="${f1(R() * 400)}" cy="${f1(700 + R() * 100)}" r="${f1(2 + R() * 2.5)}" fill="${fc[i % fc.length]}"/>`;
      return `<defs>${grad(id + 's', [[0, '#6fc0f2'], [0.7, '#d9f1ff']])}
        <radialGradient id="${id}g"><stop offset="0" stop-color="#fff6c0" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c0" stop-opacity="0"/></radialGradient></defs>
        <rect width="400" height="800" fill="url(#${id}s)"/>
        <circle cx="70" cy="90" r="110" fill="url(#${id}g)"/><circle cx="70" cy="90" r="34" fill="#fff3a8"/>${clouds}
        <path d="${ridge(R, 600, 70, 5)}" fill="#a8dc8c"/>
        <path d="${ridge(R, 670, 50, 4)}" fill="#7fca6a"/>
        <path d="${ridge(R, 740, 30, 4)}" fill="#55ad55"/>${flowers}`;
    },
  };

  function scene(sceneId) {
    const id = 's' + (++uid);
    const body = (SCENES[sceneId] || SCENES.night)(id);
    return `<svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style="display:block">${body}</svg>`;
  }

  root.Gfx = { COLORS, TUBES, ballSprite, eggArt, tubeSVG, scene, drawEgg, tone };
})(this);
