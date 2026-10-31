const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = path.resolve(__dirname, '../..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }
  let safePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  if (safePath === '/no-csp.html' || safePath === '\\no-csp.html') {
    const indexPath = path.join(ROOT, 'index.html');
    fs.readFile(indexPath, 'utf8', (readErr, content) => {
      if (readErr) {
        res.writeHead(readErr.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
        res.end(readErr.code === 'ENOENT' ? '404 Not Found' : '500 Server Error');
        return;
      }
      const stripped = content.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i, '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(stripped);
    });
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const targetFile = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;

    fs.readFile(targetFile, (readErr, content) => {
      if (readErr) {
        res.writeHead(readErr.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
        res.end(readErr.code === 'ENOENT' ? '404 Not Found' : '500 Server Error');
        return;
      }

      const ext = path.extname(targetFile).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
