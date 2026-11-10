/* Dev server for the Soda Can studio: serves the repo and proxies the HMR-free
   static assets, binding 0.0.0.0 so the sandbox preview proxy can reach it. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = '/home/user/egytube2';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.psd': 'application/octet-stream', '.ora': 'application/zip', '.gif': 'image/gif', '.md': 'text/markdown; charset=utf-8', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '/studio' || u === '/studio/') { res.writeHead(302, { Location: '/public/soda/studio/index.html' }); return res.end(); }
  let p = path.join(ROOT, u);
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found: ' + u); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
});
server.listen(8100, '0.0.0.0', () => console.log('studio on http://0.0.0.0:8100/'));
