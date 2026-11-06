// Sprite registry. Placeholder pixel art is generated from the strings below.
// To use real art: drop 12x9 PNGs in assets/sprites/ and call
//   CC.Sprites.override('rat0','assets/sprites/rat0.png')  (rat0 = idle, rat1 = run frame)
// Keep the same size or adjust the draw offset in game.js (search "Sprites.get").
CC.Sprites = (function () {
  const PAL = { y:'#ffd23f', b:'#a8741a', k:'#111111', w:'#ffffff', p:'#ff8fa3' };
  const DATA = {
    rat0:['..bb....bb..','.bppb..bppb.','.byyyyyyyyb.','.yyyyyyyyyy.','.yywkyywkyy.',
          '.yyyyyyyyyy.','..yyyppyyy..','..yyyyyyyy..','..bb....bb..'],
    rat1:['..bb....bb..','.bppb..bppb.','.byyyyyyyyb.','.yyyyyyyyyy.','.yywkyywkyy.',
          '.yyyyyyyyyy.','..yyyppyyy..','..yyyyyyyy..','...bb..bb...']
  };
  const cache = {};
  function make(rows) {
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const x = c.getContext('2d');
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }));
    return c;
  }
  for (const k in DATA) cache[k] = make(DATA[k]);
  function override(name, url) { const i = new Image(); i.onload = () => { cache[name] = i; }; i.src = url; }
  return { get: n => cache[n], override };
})();
