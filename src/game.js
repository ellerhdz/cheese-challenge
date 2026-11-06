// Game engine: physics, hazards, rendering. Canvas 2D, fixed 60Hz timestep (deterministic -> replayable).
(function () {
  'use strict';
  const C = CC.CFG, S = CC.SCORE, T = C.T;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const G = CC.Game = { state: 'menu', run: null, onEnd: null, onFrame: null };
  const inp = { l: 0, r: 0, j: 0 };
  let jumpPrev = 0, lv = null, p = null, cam = 0, parts = [], shake = 0, tA = 0, deadT = 0, clearT = 0;
  const KEYS = { ArrowLeft:'l', KeyA:'l', ArrowRight:'r', KeyD:'r', ArrowUp:'j', KeyW:'j', Space:'j', KeyZ:'j', KeyC:'j' };

  G.setInput = (k, v) => { inp[k] = v ? 1 : 0; };
  function clearInput() {
    inp.l = inp.r = inp.j = 0;
    jumpPrev = 0;
  }
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = KEYS[e.code];
    if (k) { inp[k] = 1; e.preventDefault(); }
    else if (G.state === 'play') { if (e.code === 'KeyR') G.start(); if (e.code === 'KeyQ') G.finish(); }
  });
  addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) inp[k] = 0; });
  // Avoid a character continuing to move or jump after a tab/app switch.
  addEventListener('blur', clearInput);
  addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });

  const rect = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const appr = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
  const run_ = () => G.run;

  G.score = () => { const r = G.run; return r ? Math.max(0, r.cheese * S.CHEESE + r.levelsDone * S.LEVEL + r.bonus - r.deaths * S.DEATH_PENALTY) : 0; };
  G.levelName = () => lv ? lv.d.name : '';
  G.start = function () {
    G.run = { level: 0, cheese: 0, deaths: 0, time: 0, levelsDone: 0, bonus: 0 };
    G.state = 'play'; jumpPrev = 0; parts = [];
    CC.Rewards && CC.Rewards.onRunStart && CC.Rewards.onRunStart();
    load(0);
  };
  G.finish = function () { if (G.state === 'play') finish(false); };

  function load(i) {
    const d = CC.LEVELS[i]; run_().level = i;
    lv = { d, w: d.w, grid: d.grid, time: 0,
      cheese: d.cheese.map(c => ({ x: c.x, y: c.y, got: false })),
      saws: d.saws.map(s => ({ ...s, d: 0, dir: 1, x: s.x0, y: s.y0, a: 0 })),
      plats: d.plats.map(m => ({ ...m, d: 0, dir: 1, x: m.x0, dx: 0, h: 6 })),
      dis: {}, cps: d.cps.map(c => ({ x: c.x, y: c.y, on: false })),
      spawn: { x: d.start.c * T + 3, y: d.start.r * T + T - 9 } };
    for (let r = 0; r < C.ROWS; r++) for (let c = 0; c < d.w; c++) if (d.grid[r][c] === 'D') lv.dis[r * d.w + c] = { s: 0, t: 0 };
    spawn(); clearT = 0; cam = Math.max(0, lv.spawn.x - C.W / 2);
  }
  function spawn() {
    p = { x: lv.spawn.x, y: lv.spawn.y, w: 10, h: 9, vx: 0, vy: 0, g: false, f: 1, coy: 0, buf: 0, ride: null, dead: false, anim: 0 };
    for (const k in lv.dis) { lv.dis[k].s = 0; lv.dis[k].t = 0; }
  }
  function burst(x, y, n, cols, sp = 120) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = Math.random() * sp;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: .6 + Math.random() * .6, c: cols[i % cols.length], s: 1 + (Math.random() * 2 | 0) }); }
  }
  function kill() {
    if (p.dead) return;
    p.dead = true; deadT = C.RESPAWN; G.run.deaths++; shake = .3;
    burst(p.x + 5, p.y + 4, 30, ['#ffd23f', '#a8741a', '#ff4d4d']);
  }
  function clear() {
    const r = G.run; r.levelsDone++;
    lv.bonus = Math.max(0, Math.round(S.PAR - lv.time)) * S.TIME_BONUS; r.bonus += lv.bonus;
    clearT = 1.6;
    for (let i = 0; i < 3; i++) burst(p.x + 5, p.y, 40, ['#ffd23f', '#39ff14', '#fff1a8'], 200);
  }
  function next() { if (G.run.level + 1 >= CC.LEVELS.length) finish(true); else load(G.run.level + 1); }
  function finish(won) {
    const r = G.run; G.state = 'over';
    const res = { score: G.score(), level: won ? CC.LEVELS.length : r.level + 1, time: r.time, cheese: r.cheese, deaths: r.deaths, won: !!won };
    G.onEnd && G.onEnd(res);
  }

  // ---- collision helpers
  function solid(c, r) {
    if (c < 0 || c >= lv.w) return true;
    if (r < 0 || r >= C.ROWS) return false;
    const t = lv.grid[r][c];
    return t === '#' || (t === 'D' && lv.dis[r * lv.w + c].s !== 2);
  }
  function moveX(dx) {
    if (!dx) return;
    p.x += dx;
    const r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - .01) / T);
    const c = dx > 0 ? Math.floor((p.x + p.w - .01) / T) : Math.floor(p.x / T);
    for (let r = r0; r <= r1; r++) if (solid(c, r)) { p.x = dx > 0 ? c * T - p.w : (c + 1) * T; p.vx = 0; break; }
  }
  function moveY(dy) {
    const prevB = p.y + p.h;
    p.y += dy; p.g = false; p.ride = null;
    const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - .01) / T);
    if (dy >= 0) {
      const r = Math.floor((p.y + p.h) / T);
      for (let c = c0; c <= c1; c++) if (solid(c, r)) { p.y = r * T - p.h; p.vy = 0; p.g = true; break; }
      for (const m of lv.plats)
        if (p.x + p.w > m.x && p.x < m.x + m.w && prevB <= m.y + 1 && p.y + p.h >= m.y && p.vy >= 0) { p.y = m.y - p.h; p.vy = 0; p.g = true; p.ride = m; }
    } else {
      const r = Math.floor(p.y / T);
      for (let c = c0; c <= c1; c++) if (solid(c, r)) { p.y = (r + 1) * T; p.vy = 0; break; }
    }
  }

  function world(dt) {
    for (const s of lv.saws) {
      s.d += s.dir * s.speed * dt;
      if (s.d > s.range) { s.d = s.range; s.dir = -1; } else if (s.d < 0) { s.d = 0; s.dir = 1; }
      s.x = s.x0 + (s.ax === 'h' ? s.d : 0); s.y = s.y0 + (s.ax === 'v' ? s.d : 0); s.a += dt * 12;
    }
    for (const m of lv.plats) {
      const ox = m.x; m.d += m.dir * m.speed * dt;
      if (m.d > m.range) { m.d = m.range; m.dir = -1; } else if (m.d < 0) { m.d = 0; m.dir = 1; }
      m.x = m.x0 + m.d; m.dx = m.x - ox;
    }
    for (const k in lv.dis) {          // vanishing blocks: 0 solid -> 1 shaking -> 2 gone -> back to 0
      const d = lv.dis[k]; if (!d.s) continue;
      d.t -= dt;
      if (d.t <= 0) {
        if (d.s === 1) { d.s = 2; d.t = 1.6; }
        else { const n = +k; if (rect(p, { x: (n % lv.w) * T, y: Math.floor(n / lv.w) * T, w: T, h: T })) d.t = .1; else d.s = 0; }
      }
    }
  }

  function player(dt) {
    const mv = inp.r - inp.l, jp = inp.j && !jumpPrev; jumpPrev = inp.j;
    p.vx = appr(p.vx, mv * C.SPEED, (mv === 0 ? C.ACC * 1.5 : (p.g ? C.ACC : C.AIR)) * dt);
    if (mv) p.f = mv;
    p.buf = jp ? C.BUFFER : p.buf - dt;
    p.coy = p.g ? C.COYOTE : p.coy - dt;
    if (p.buf > 0 && p.coy > 0) { p.vy = C.JUMP; p.buf = 0; p.coy = 0; p.g = false; burst(p.x + 5, p.y + 9, 6, ['#fff1a8', '#d9a400'], 40); }
    p.vy = Math.min(C.MAXFALL, p.vy + C.GRAV * dt * (p.vy < 0 && !inp.j ? 2.2 : 1));
    if (p.ride) p.x += p.ride.dx;
    moveX(p.vx * dt); moveY(p.vy * dt);
    p.anim += dt;
    if (p.g) {                         // stepping on a vanishing block arms it
      const r = Math.floor((p.y + p.h + .5) / T);
      for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - .01) / T); c++) {
        const d = lv.dis[r * lv.w + c];
        if (d && lv.grid[r][c] === 'D' && d.s === 0) { d.s = 1; d.t = .35; }
      }
    }
    if (p.y > C.ROWS * T + 20) return kill();
    const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - .01) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - .01) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (r < 0 || r >= C.ROWS || c < 0 || c >= lv.w) continue;
      const t = lv.grid[r][c];
      if (t === '^' && rect(p, { x: c * T + 3, y: r * T + 8, w: 10, h: 8 })) return kill();
      if (t === '~' && rect(p, { x: c * T, y: r * T + 4, w: T, h: 12 })) return kill();
    }
    for (const s of lv.saws) {
      const nx = Math.max(p.x, Math.min(s.x, p.x + p.w)), ny = Math.max(p.y, Math.min(s.y, p.y + p.h));
      if ((nx - s.x) ** 2 + (ny - s.y) ** 2 < 36) return kill();
    }
    for (const c of lv.cheese) if (!c.got && (c.x - p.x - 5) ** 2 + (c.y - p.y - 4) ** 2 < 100) {
      c.got = true; G.run.cheese++; burst(c.x, c.y, 10, ['#ffd23f', '#39ff14'], 70);
    }
    for (const cp of lv.cps) if (!cp.on && rect(p, { x: cp.x, y: cp.y, w: T, h: T })) {
      lv.cps.forEach(o => o.on = false); cp.on = true;
      lv.spawn = { x: cp.x + 3, y: cp.y + T - 9 }; burst(cp.x + 8, cp.y + 4, 14, ['#39ff14', '#ffffff'], 80);
    }
    const g = lv.d.goal;
    if (rect(p, { x: g.c * T, y: g.r * T, w: T, h: T })) clear();
  }

  function step(dt) {
    tA += dt; shake = Math.max(0, shake - dt);
    for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt; q.life -= dt; }
    parts = parts.filter(q => q.life > 0);
    if (G.state !== 'play' || !lv) return;
    if (clearT > 0) { clearT -= dt; if (clearT <= 0) next(); return; }
    G.run.time += dt; lv.time += dt;
    world(dt);
    if (p.dead) { deadT -= dt; if (deadT <= 0) spawn(); return; }
    player(dt);
  }

  // ---- rendering (all placeholder art is drawn with shapes; swap in sprites via CC.Sprites)
  function bg() {
    const off = (cam * .25 + tA * 6) % 24;
    ctx.fillStyle = 'rgba(57,255,20,.07)';
    for (let x = -off; x < C.W; x += 24) ctx.fillRect(x, 0, 1, C.H);
    for (let y = 0; y < C.H; y += 24) ctx.fillRect(0, y, C.W, 1);
    ctx.fillStyle = 'rgba(255,210,63,.35)';
    for (let i = 0; i < 24; i++) ctx.fillRect(((i * 97 - cam * (.1 + (i % 3) * .05)) % C.W + C.W) % C.W, (i * 53) % C.H, 1, 1);
  }
  function draw() {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, C.W, C.H);
    if (!lv || !p) { bg(); return; }
    const tgt = Math.max(0, Math.min(lv.w * T - C.W, p.x + 5 - C.W / 2)); cam += (tgt - cam) * .15;
    bg();
    ctx.save();
    ctx.translate(-Math.round(cam) + (shake > 0 ? (Math.random() - .5) * 4 : 0), shake > 0 ? (Math.random() - .5) * 4 : 0);
    const g = lv.grid, c0 = Math.max(0, Math.floor(cam / T)), c1 = Math.min(lv.w - 1, c0 + C.W / T + 1);
    for (let r = 0; r < C.ROWS; r++) for (let c = c0; c <= c1; c++) {
      const t = g[r][c]; if (t === '.') continue; let x = c * T; const y = r * T;
      if (t === '#') {
        ctx.fillStyle = '#d9a400'; ctx.fillRect(x, y, T, T);
        if (r === 0 || g[r - 1][c] !== '#') { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, y, T, 3); }
        if ((c * 7 + r * 13) % 4 === 0) { ctx.fillStyle = '#8a6500'; ctx.fillRect(x + 4, y + 6, 4, 4); }
      } else if (t === '^') {
        ctx.fillStyle = '#e8e8e8';
        for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 8, y + 16); ctx.lineTo(x + i * 8 + 4, y + 8); ctx.lineTo(x + i * 8 + 8, y + 16); ctx.fill(); }
      } else if (t === '~') {
        ctx.fillStyle = '#ff5a1f'; ctx.fillRect(x, y + 4, T, 12);
        ctx.fillStyle = '#ffb347'; ctx.fillRect(x, y + 4 + Math.sin(tA * 4 + c) * 1.5, T, 2);
      } else if (t === 'D') {
        const d = lv.dis[r * lv.w + c];
        if (d.s === 2) { ctx.strokeStyle = 'rgba(57,255,20,.15)'; ctx.strokeRect(x + .5, y + .5, 15, 15); continue; }
        if (d.s === 1) x += (Math.random() - .5) * 2;
        ctx.fillStyle = d.s === 1 ? '#7a4a00' : '#145c2a'; ctx.fillRect(x, y, T, T);
        ctx.strokeStyle = '#39ff14'; ctx.strokeRect(x + .5, y + .5, 15, 15);
      }
    }
    for (const m of lv.plats) { ctx.fillStyle = '#0b3d1a'; ctx.fillRect(m.x, m.y, m.w, 6); ctx.fillStyle = '#39ff14'; ctx.fillRect(m.x, m.y, m.w, 3); }
    for (const cp of lv.cps) { ctx.fillStyle = '#aaa'; ctx.fillRect(cp.x + 7, cp.y + 2, 2, 14); ctx.fillStyle = cp.on ? '#39ff14' : '#555'; ctx.fillRect(cp.x + 9, cp.y + 2, 6, 5); }
    for (const c of lv.cheese) if (!c.got) {
      const b = Math.sin(tA * 4 + c.x) * 2;
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(c.x - 5, c.y + 4 + b); ctx.lineTo(c.x + 5, c.y + 4 + b); ctx.lineTo(c.x + 5, c.y - 3 + b); ctx.fill();
      ctx.fillStyle = '#a8741a'; ctx.fillRect(c.x + 1, c.y + 1 + b, 2, 2);
    }
    const gl = lv.d.goal, gx = gl.c * T + 8, gy = gl.r * T + 8;
    ctx.strokeStyle = '#39ff14'; ctx.beginPath(); ctx.arc(gx, gy, 9 + Math.sin(tA * 5), 0, 6.283); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(gx, gy, 7, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#a8741a'; ctx.fillRect(gx - 3, gy - 3, 3, 3); ctx.fillRect(gx + 1, gy + 1, 3, 3);
    for (const s of lv.saws) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.fillStyle = '#ccc';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, 6.283); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.fillRect(-1.5, -8, 3, 4); }
      ctx.fillStyle = '#555'; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
    if (!p.dead) {
      ctx.save(); ctx.translate(Math.round(p.x + 5), Math.round(p.y)); ctx.scale(p.f, 1);
      const fr = p.g && Math.abs(p.vx) > 10 ? 'rat' + (Math.floor(p.anim * 10) % 2) : 'rat0';
      ctx.drawImage(CC.Sprites.get(fr), -6, 0); ctx.restore();
    }
    for (const q of parts) { ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, q.s, q.s); }
    ctx.restore();
    if (clearT > 0) {
      ctx.textAlign = 'center'; ctx.font = '16px "Press Start 2P",monospace';
      ctx.fillStyle = '#ffd23f'; ctx.fillText('LEVEL CLEAR!', C.W / 2, 84);
      ctx.font = '8px "Press Start 2P",monospace'; ctx.fillStyle = '#39ff14'; ctx.fillText('TIME BONUS +' + lv.bonus, C.W / 2, 104);
    }
  }

  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(.1, (now - last) / 1000); last = now;
    while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
    draw(); G.onFrame && G.onFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // Test-only hooks. Never expose mutable player/level objects in a public build.
  if (window.__CC_TEST__) G.debug = { step, draw, player: () => p, level: () => lv, input: () => ({ ...inp }) };
})();
