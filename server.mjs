import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const ROOT = resolve(process.cwd(), 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** Runtime configuration handed to the browser so Supabase can be enabled
 *  by setting environment variables without rebuilding the image. */
function configScript() {
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    // Only public credentials are ever exposed here; the service role key stays server-side.
  };
  return `window.__URUGOCARE_CONFIG__ = ${JSON.stringify(config)};`;
}

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/healthz' || pathname === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ status: 'ok', app: 'urugocare', time: new Date().toISOString() }));
    return;
  }

  if (pathname === '/config.js') {
    res.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    });
    res.end(configScript());
    return;
  }

  if (pathname === '/' || pathname === '') pathname = '/index.html';

  // Prevent path traversal outside the build directory.
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, safe);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (await fileExists(filePath)) {
    const ext = extname(filePath).toLowerCase();
    const immutable = /\/assets\/.+-[A-Za-z0-9_]{6,}\./.test(filePath) || ext === '.woff2';
    try {
      const body = await readFile(filePath);
      res.writeHead(200, {
        'content-type': MIME[ext] || 'application/octet-stream',
        'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
        'x-content-type-options': 'nosniff',
      });
      res.end(body);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Internal Server Error');
    }
    return;
  }

  // Single page application fallback.
  const index = join(ROOT, 'index.html');
  if (await fileExists(index)) {
    const body = await readFile(index);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
    res.end(body);
    return;
  }

  res.writeHead(503, { 'content-type': 'text/plain' });
  res.end('Application bundle not found. Run the build step.');
});

server.listen(PORT, HOST, () => {
  console.log(`URUGOCARE listening on http://${HOST}:${PORT}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
