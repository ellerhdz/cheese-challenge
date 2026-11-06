// DOM UI: menus, HUD, touch controls, end screen + leaderboard rendering.
(function () {
  'use strict';
  const $ = id => document.getElementById(id), G = CC.Game, LB = CC.Leaderboard;
  const fmt = s => Math.floor(s / 60) + ':' + (s % 60).toFixed(2).padStart(5, '0');
  function show(id) {
    document.querySelectorAll('.ov').forEach(o => o.classList.toggle('on', o.id === id));
    document.body.classList.toggle('playing', !id);
  }
  function table(el, list, hl) {
    el.textContent = '';
    if (!list.length) { el.textContent = 'NO SCORES YET'; return; }
    const t = document.createElement('table'), h = t.insertRow();
    ['#', 'NAME', 'SCORE', 'LEVEL', 'TIME'].forEach(x => { const th = document.createElement('th'); th.textContent = x; h.appendChild(th); });
    list.slice(0, 10).forEach((e, i) => {
      const r = t.insertRow(); if (hl && e.ts === hl.ts) r.className = 'me';
      [i + 1, e.name, e.score, e.level, fmt(e.time)].forEach(v => { r.insertCell().textContent = v; });
    });
    el.appendChild(t);
  }
  async function openLB() {
    show('lb');
    $('lbnote').textContent = LB.isGlobal ? 'GLOBAL SCORES' : 'LOCAL ONLY: scores are saved in this browser, not shared online';
    table($('lbbody'), await LB.list());
  }
  const play = () => { show(null); G.start(); };

  $('b-play').onclick = play; $('b-again').onclick = play;
  $('b-lb').onclick = openLB; $('b-how').onclick = () => show('how');
  $('b-lb-back').onclick = $('b-how-back').onclick = $('b-menu').onclick = () => show('menu');
  $('b-restart').onclick = () => G.state === 'play' && G.start();
  $('b-finish').onclick = () => G.finish();

  let result = null, done = false;
  const bestTxt = () => { const b = LB.best(); return b ? b.score : '-'; };
  G.onEnd = r => {
    result = r; done = false;
    $('endtitle').textContent = r.won ? 'YOU BEAT THE CHEESE!' : 'RUN OVER';
    $('s-score').textContent = r.score; $('s-level').textContent = r.level + '/' + CC.LEVELS.length;
    $('s-time').textContent = fmt(r.time); $('s-best').textContent = bestTxt();
    try { $('name').value = localStorage.getItem('cc.name') || ''; } catch (e) {}
    $('submit').disabled = false; $('endmsg').textContent = ''; $('endlb').textContent = '';
    show('end');
  };
  $('submit').onclick = async () => {
    if (!result || done) return; done = true; $('submit').disabled = true;
    const name = LB.clean($('name').value);
    try { localStorage.setItem('cc.name', name); } catch (e) {}
    const e = await LB.submit(result, name);
    CC.Rewards.submitRunForVerification(result, e);   // stub: no rewards yet
    $('s-best').textContent = bestTxt();
    $('endmsg').textContent = LB.isGlobal ? 'SCORE SUBMITTED' : 'SAVED LOCALLY on this device (not a global ranking)';
    table($('endlb'), await LB.list(), e);
  };

  G.onFrame = () => {
    const r = G.run; if (!r || G.state !== 'play') return;
    $('h-lv').textContent = (r.level + 1) + '/' + CC.LEVELS.length + ' ' + G.levelName();
    $('h-time').textContent = fmt(r.time); $('h-score').textContent = G.score(); $('h-deaths').textContent = r.deaths;
  };

  document.querySelectorAll('#touch [data-k]').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); G.setInput(k, 1); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => G.setInput(k, 0)));
  });
  addEventListener('contextmenu', e => e.preventDefault());
  $('logo').getContext('2d').drawImage(CC.Sprites.get('rat0'), 0, 0);
  show('menu');
})();
