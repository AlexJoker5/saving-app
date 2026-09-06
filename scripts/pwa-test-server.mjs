import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

// Serve two releases of the actual production build from one origin. Only the
// HTML revision changes; the generated Workbox worker handles the real upgrade.
const root = resolve('dist');
const originalHtml = await readFile(resolve(root, 'index.html'), 'utf8');
const originalWorker = await readFile(resolve(root, 'sw.js'), 'utf8');
const releases = Object.fromEntries(
  ['a', 'b'].map((version) => {
    const html = originalHtml.replace(
      '</head>',
      `<meta name="test-release" content="${version}"></head>`,
    );
    const revision = createHash('sha256').update(html).digest('hex');
    const worker = originalWorker.replace(
      /(url:"index\.html",revision:")[^"]+("\})/,
      `$1${revision}$2`,
    );
    if (worker === originalWorker)
      throw new Error(
        'Could not find the generated index.html precache revision.',
      );
    return [version, { html, worker }];
  }),
);
let release = 'a';
const types = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1:4183').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (
    request.method === 'POST' &&
    /^\/__release\/(a|b|broken)$/.test(pathname)
  ) {
    release = pathname.split('/').at(-1);
    response.end('OK');
    return;
  }
  if (pathname === '/sw.js') {
    if (release === 'broken') {
      response.writeHead(503).end('Temporarily unavailable');
    } else {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(releases[release].worker);
    }
    return;
  }
  if (
    ['/', '/index.html', '/savings', '/setup', '/expenses'].includes(pathname)
  ) {
    response.setHeader('Content-Type', 'text/html');
    response.end(releases[release === 'broken' ? 'a' : release].html);
    return;
  }
  const path = resolve(root, `.${decodeURIComponent(pathname)}`);
  if (!path.startsWith(root + sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    response.setHeader(
      'Content-Type',
      types[extname(path)] ?? 'application/octet-stream',
    );
    response.end(await readFile(path));
  } catch {
    response.writeHead(404).end();
  }
}).listen(4183, '127.0.0.1', () =>
  console.log('Production PWA test server ready on 4183'),
);
