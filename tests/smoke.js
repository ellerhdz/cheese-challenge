// Headless smoke test: node tests/smoke.js  (stubs the DOM, runs the engine, checks levels + leaderboard)
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert');
const ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : () => ({ width: 0 }), set: (t, k, v) => (t[k] = v, true) });
const cvs = () => ({ width: 320, height: 192, getContext: () => ctx });
global.window = global; global.document = { getElementById: cvs, createElement: cvs, hidden: false };
const listeners = {}; global.addEventListener = (name, fn) => { listeners[name] = fn; }; global.requestAnimationFrame = () => {};
global.__CC_TEST__ = true;
const store = {}; global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
for (const f of ['config', 'sprites', 'leaderboard', 'rewards', 'game'])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), { filename: f });

const G = CC.Game, dbg = G.debug;
assert(dbg, 'test hooks should only be available in test mode');
CC.LEVELS.forEach(L => {
  assert(L.goal, L.name + ' has no goal');
  assert.strictEqual(L.grid.length, 12); L.grid.forEach(r => assert.strictEqual(r.length, L.w));
  assert.strictEqual(L.grid[L.start.r][L.start.c], '.', L.name + ' start blocked');
  assert(L.goal.c < L.w && L.grid[L.goal.r][L.goal.c] === '.', L.name + ' goal invalid');
});
console.log('levels ok:', CC.LEVELS.map(l => l.name).join(', '));

(async () => {
  let ended = null; G.onEnd = r => { ended = r; };
  G.start();
  G.setInput('r', 1);
  for (let i = 0; i < 4000; i++) { G.setInput('j', i % 40 < 12); dbg.step(1 / 60); if (i % 7 === 0) dbg.draw(); }
  assert(G.run.deaths > 0 || G.run.time > 0); console.log('bot ran: deaths', G.run.deaths, 'cheese', G.run.cheese);
  G.setInput('r', 0); G.setInput('j', 0);

  G.setInput('l', 1); G.setInput('j', 1); listeners.blur();
  assert.deepStrictEqual(dbg.input(), { l: 0, r: 0, j: 0 }, 'blur should clear stuck inputs');

  G.start();                                   // force-complete every level
  for (let i = 0; i < CC.LEVELS.length; i++) {
    const g = dbg.level().d.goal, p = dbg.player(); p.x = g.c * 16 + 3; p.y = g.r * 16 + 4;
    for (let n = 0; n < 130; n++) dbg.step(1 / 60);
  }
  assert(ended && ended.won, 'run should end as won'); console.log('full run result:', ended);
  const e = await CC.Leaderboard.submit(ended, 'tester!!');
  const list = await CC.Leaderboard.list();
  assert.strictEqual(list[0].name, 'TESTER'); assert.strictEqual(CC.Leaderboard.best().score, e.score);
  console.log('leaderboard ok (local provider, global =', CC.Leaderboard.isGlobal + ')'); console.log('ALL OK');
})().catch(e => { console.error(e); process.exit(1); });
