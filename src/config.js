// Global config + level data. Every other file reads from window.CC.
window.CC = window.CC || {};

// Physics/feel. Tweak these first if the game feels off. Units: px, seconds. Tile = 16px.
CC.CFG = { T:16, W:320, H:192, ROWS:12, SPEED:105, ACC:900, AIR:650, GRAV:900,
           JUMP:-295, MAXFALL:360, COYOTE:.08, BUFFER:.1, RESPAWN:.55 };

// Score rules (client-side only: NOT trustworthy for real rewards, see rewards.js)
CC.SCORE = { CHEESE:100, LEVEL:1000, TIME_BONUS:10, PAR:60, DEATH_PENALTY:25 };

// Level builder. Each op: [code, ...args]. Columns/rows are in tiles; ground is rows 10-11.
//  p c r n  platform   | s c r n  spikes      | d c r n  vanishing block | l a b  lava cols [a,b)
//  k c r    checkpoint | o c r    cheese      | G c r    goal            | sw/sv c r range speed  saw (h / v)
//  m c r n range speed moving platform (horizontal)
(function () {
  const T = 16, R = 12;
  const OPS = {
    p:(L,c,r,n)=>{for(let i=0;i<n;i++)L.grid[r][c+i]='#'},
    s:(L,c,r,n)=>{for(let i=0;i<n;i++)L.grid[r][c+i]='^'},
    d:(L,c,r,n)=>{for(let i=0;i<n;i++)L.grid[r][c+i]='D'},
    l:(L,a,b)=>{for(let c=a;c<b;c++){L.grid[10][c]='~';L.grid[11][c]='~'}},
    k:(L,c,r)=>L.cps.push({x:c*T,y:r*T}),
    o:(L,c,r)=>L.cheese.push({x:c*T+8,y:r*T+8}),
    G:(L,c,r)=>{L.goal={c,r}},
    sw:(L,c,r,n,v)=>L.saws.push({ax:'h',x0:c*T+8,y0:r*T+8,range:n*T,speed:v}),
    sv:(L,c,r,n,v)=>L.saws.push({ax:'v',x0:c*T+8,y0:r*T+8,range:n*T,speed:v}),
    m:(L,c,r,n,range,v)=>L.plats.push({x0:c*T,y:r*T,w:n*T,range:range*T,speed:v})
  };
  function build(name, w, ops) {
    const L = { name, w, grid:[], cps:[], cheese:[], saws:[], plats:[], start:{c:2,r:9}, goal:null };
    for (let r = 0; r < R; r++) L.grid.push(Array(w).fill(r >= 10 ? '#' : '.'));
    ops.forEach(o => OPS[o[0]](L, ...o.slice(1)));
    return L;
  }
  CC.LEVELS = [
    build('CHEESE 101', 48, [['o',6,8],['l',15,18],['o',16,7],['k',22,9],['s',26,9,2],['o',27,7],
      ['l',33,36],['o',34,7],['p',40,8,3],['o',41,7],['G',46,9]]),
    build('SPIKE ALLEY', 56, [['s',10,9,2],['o',10,7],['k',16,9],['s',20,9,1],['s',23,9,1],['s',26,9,3],['o',27,7],
      ['l',32,36],['p',33,8,2],['o',34,6],['k',38,9],['s',41,9,6],['d',41,8,1],['d',43,8,1],['d',45,8,1],['o',43,6],['G',52,9]]),
    build('MELTDOWN', 64, [['l',8,16],['m',9,9,3,3,50],['o',11,6],['k',18,9],['l',20,23],['o',21,7],['l',24,34],
      ['d',25,8,2],['d',28,8,2],['d',31,8,2],['o',29,6],['k',36,9],['l',40,50],['m',41,8,2,5,60],['o',45,5],
      ['s',52,9,2],['sw',56,9,4,70],['G',61,9]]),
    build('SAW MILL', 66, [['sw',8,9,4,70],['o',10,6],['k',15,9],['sw',20,9,4,90],['p',26,8,2],['sw',26,6,4,60],['o',27,5],
      ['k',33,9],['sv',37,5,4,70],['sv',41,5,4,90],['o',39,6],['l',45,48],['sv',46,5,4,70],['k',50,9],
      ['sw',54,9,3,110],['sw',58,9,3,110],['o',56,6],['G',63,9]]),
    build('RAT HELL', 82, [['s',6,9,2],['o',7,7],['l',10,13],['k',16,9],['l',19,23],['d',20,8,1],['d',22,8,1],
      ['s',26,9,3],['sw',26,6,2,80],['o',30,6],['k',32,9],['l',34,38],['m',35,8,2,2,70],['l',41,47],
      ['d',42,8,1],['d',44,8,1],['d',46,8,1],['k',50,9],['sv',53,4,5,100],['sv',56,4,5,120],['s',58,9,2],['o',57,6],
      ['l',62,66],['p',63,8,2],['k',68,9],['sw',70,9,4,120],['sw',74,9,4,100],['s',72,9,1],['o',72,6],['G',79,9]])
  ];
})();
