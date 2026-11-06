// Leaderboard with swappable providers.
// CURRENT: localStorage only -> scores live in THIS browser and are NOT shared or global.
// TO GO GLOBAL: implement a provider {name, global:true, submit(entry), list()} that talks to your
// backend and call CC.Leaderboard.setProvider(remote). UI code does not need to change.
CC.Leaderboard = (function () {
  const KEY = 'cheesechallenge.scores.v1', BEST = 'cheesechallenge.best.v1', MAX = 50;
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const sort = l => l.sort((a, b) => b.score - a.score || a.time - b.time);
  const clean = n => String(n || '').replace(/[^\w ]/g, '').trim().slice(0, 12).toUpperCase() || 'RAT';

  const localProvider = {
    name: 'local', global: false,
    async submit(e) { const l = read(KEY, []); l.push(e); write(KEY, sort(l).slice(0, MAX)); },
    async list() { return sort(read(KEY, [])); }
  };

  /* Example remote provider (NOT enabled). The server MUST validate and rate-limit; never trust the client score.
  const remote = { name:'api', global:true,
    async submit(e){ await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e)}); },
    async list(){ return (await fetch('/api/scores?limit=50')).json(); } }; */

  let prov = localProvider;
  return {
    setProvider(p) { prov = p; },
    get isGlobal() { return prov.global; },
    clean,
    list: () => prov.list(),
    best: () => read(BEST, null),
    async submit(res, name) {
      const e = { name: clean(name), score: res.score, level: res.level, time: +res.time.toFixed(2), ts: Date.now() };
      await prov.submit(e);
      const b = read(BEST, null);
      if (!b || e.score > b.score) write(BEST, e);   // personal best on this device
      return e;
    }
  };
})();
