const http = require('http');
const fs = require('fs');
const path = require('path');
// Serve from the directory that holds this file, so the server works no
// matter where it is checked out (no machine-specific symlinks needed).
const ROOT = __dirname;
const PORT = 8770;
const EDITOR_TUNE_FILE = path.join(ROOT, 'editor_tune.json');

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

function readJsonBody(req, limit, cb) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > limit) {
      req.destroy();
      cb(new Error('payload too large'));
    }
  });
  req.on('end', () => {
    try { cb(null, JSON.parse(body)); }
    catch (e) { cb(e); }
  });
  req.on('error', cb);
}

http.createServer((req, res) => {
  // POST /save-editor-tune — writes editor values to editor_tune.json so they
  // can be committed to the repo and travel across machines.
  if (req.method === 'POST' && req.url === '/save-editor-tune') {
    readJsonBody(req, 256 * 1024, (err, parsed) => {
      if (err) { res.writeHead(400); return res.end('bad request: ' + err.message); }
      if (!parsed || typeof parsed !== 'object') { res.writeHead(400); return res.end('not an object'); }
      try {
        fs.writeFileSync(EDITOR_TUNE_FILE, JSON.stringify(parsed, null, 2) + '\n');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, path: 'editor_tune.json' }));
      } catch (e) {
        res.writeHead(500);
        res.end('write failed: ' + e.message);
      }
    });
    return;
  }

  // Default: static file serving.
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/wooloop_prototype.html';
  const fp = path.join(ROOT, urlPath);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found: ' + urlPath); }
    const headers = { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' };
    // Don't cache the editor-tune file — it's small and the page reloads after
    // a save to pick up new values.
    if (path.basename(fp) === 'editor_tune.json') {
      headers['Cache-Control'] = 'no-store';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}).listen(PORT, () => console.log('Listening on http://localhost:' + PORT));
