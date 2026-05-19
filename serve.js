const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = '/tmp/wooloop_link';
const PORT = 8770;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.glb':  'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};
http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/wooloop_prototype.html';
  const fp = path.join(ROOT, urlPath);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found: ' + urlPath); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Listening on http://localhost:' + PORT));
