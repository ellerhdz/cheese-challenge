// Zero-dependency static server for local dev: node server.js  (PORT env optional)
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname, port = process.env.PORT || 8080;
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.json':'application/json', '.woff2':'font/woff2' };
http.createServer((q, s) => {
  let pathname;
  try { pathname = decodeURIComponent(q.url.split('?')[0]); }
  catch (e) { s.writeHead(400); return s.end('Bad request'); }
  // Resolve against the project root and require a path-boundary match. A plain
  // startsWith(root) would also allow a sibling such as "cheese-challenge-old".
  let f = path.resolve(root, '.' + pathname);
  if (f !== root && !f.startsWith(root + path.sep)) { s.writeHead(403); return s.end('Forbidden'); }
  if (f === root || f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => {
    if (e) { s.writeHead(404); return s.end('Not found'); }
    s.writeHead(200, { 'Content-Type': (mime[path.extname(f)] || 'application/octet-stream') + '; charset=utf-8' }); s.end(d);
  });
}).listen(port, () => console.log('CHEESE CHALLENGE on http://localhost:' + port));
