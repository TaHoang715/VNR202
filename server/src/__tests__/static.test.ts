import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createStaticRequestHandler } from '../static';

describe('HTTP production static handler', () => {
  let tempDir: string;
  let server: http.Server;
  let port: number;

  function makeRequest(
    requestPath: string,
    method: string = 'GET'
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: requestPath,
          method,
        },
        (res) => {
          let body = '';
          res.setEncoding('utf-8');
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              headers: res.headers,
              body,
            })
          );
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  beforeAll(async () => {
    // Create temporary directory mimicking client/dist
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vnr202-static-test-'));

    // Create index.html
    fs.writeFileSync(
      path.join(tempDir, 'index.html'),
      '<!DOCTYPE html><html><head><title>VNR202</title></head><body><div id="root">App</div></body></html>',
      'utf-8'
    );

    // Create assets/
    const assetsDir = path.join(tempDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(assetsDir, 'index-DZjWQXs4.css'),
      'body { margin: 0; background: #f6f3ed; }',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(assetsDir, 'index-BazvpCUC.js'),
      'console.log("VNR202 client bundle");',
      'utf-8'
    );

    // Create images/
    const imagesDir = path.join(tempDir, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.writeFileSync(path.join(imagesDir, 'hanoi-1946.jpg'), 'fake-jpeg-data', 'utf-8');
    fs.writeFileSync(path.join(imagesDir, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf-8');

    // Create fonts/
    const fontsDir = path.join(tempDir, 'fonts');
    fs.mkdirSync(fontsDir, { recursive: true });
    fs.writeFileSync(path.join(fontsDir, 'inter.woff2'), 'fake-woff2-binary', 'utf-8');
    fs.writeFileSync(path.join(fontsDir, 'roboto.ttf'), 'fake-ttf-binary', 'utf-8');

    // Setup HTTP server with static handler in SERVE_CLIENT mode
    const handler = createStaticRequestHandler({
      clientDistDir: tempDir,
      isServeClient: true,
      publicUrl: 'https://vnr202.onrender.com',
      getRoomCount: () => 2,
    });

    server = http.createServer(handler);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  // ─── 1. Health Endpoint ─────────────────────────────────────────────

  it('GET /health returns 200 JSON with status and room count', async () => {
    const res = await makeRequest('/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['cache-control']).toContain('no-cache');

    const data = JSON.parse(res.body);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('Giu vung can cu Game Server');
    expect(data.publicUrl).toBe('https://vnr202.onrender.com');
    expect(data.rooms).toBe(2);
    expect(typeof data.timestamp).toBe('number');
  });

  it('HEAD /health returns 200 with headers and empty body', async () => {
    const res = await makeRequest('/health', 'HEAD');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body).toBe('');
  });

  // ─── 2. HTML & SPA Fallback ─────────────────────────────────────────

  it('GET / returns 200 with index.html content and no-cache', async () => {
    const res = await makeRequest('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['cache-control']).toContain('no-cache');
    expect(res.body).toContain('<div id="root">App</div>');
  });

  it('GET /room/ABC123 nonasset SPA route returns 200 index.html', async () => {
    const res = await makeRequest('/room/ABC123');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<div id="root">App</div>');
  });

  it('GET /game nonasset SPA route returns 200 index.html', async () => {
    const res = await makeRequest('/game');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<div id="root">App</div>');
  });

  it('GET /deeply/nested/spa/path returns 200 index.html', async () => {
    const res = await makeRequest('/deeply/nested/spa/path');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('<div id="root">App</div>');
  });

  // ─── 3. HEAD Method Support ─────────────────────────────────────────

  it('HEAD / returns 200 with matching Content-Type and empty body', async () => {
    const res = await makeRequest('/', 'HEAD');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['content-length']).toBeDefined();
    expect(res.body).toBe('');
  });

  it('HEAD /assets/index-DZjWQXs4.css returns 200 text/css and empty body', async () => {
    const res = await makeRequest('/assets/index-DZjWQXs4.css', 'HEAD');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/css');
    expect(res.body).toBe('');
  });

  // ─── 4. Missing Static Assets 404 (Not Index Fallback) ──────────────

  it('GET /assets/missing.js returns 404 Not Found (not index.html)', async () => {
    const res = await makeRequest('/assets/missing.js');
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('<div id="root">App</div>');
  });

  it('GET /images/missing-image.png returns 404 Not Found', async () => {
    const res = await makeRequest('/images/missing-image.png');
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('<div id="root">App</div>');
  });

  it('GET /favicon.ico returns 404 when absent', async () => {
    const res = await makeRequest('/favicon.ico');
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('<div id="root">App</div>');
  });

  it('GET /api/unknown returns 404 JSON', async () => {
    const res = await makeRequest('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    const data = JSON.parse(res.body);
    expect(data.error).toBe('Not Found');
    expect(data.path).toBe('/api/unknown');
  });

  // ─── 5. Path Traversal & Malformed Paths ─────────────────────────────

  it('GET /../package.json returns 403 Forbidden', async () => {
    const res = await makeRequest('/../package.json');
    expect(res.status).toBe(403);
    expect(res.body).toContain('Path Traversal Blocked');
  });

  it('GET /%2e%2e%2fpackage.json returns 403 Forbidden', async () => {
    const res = await makeRequest('/%2e%2e%2fpackage.json');
    expect(res.status).toBe(403);
    expect(res.body).toContain('Path Traversal Blocked');
  });

  it('GET /assets/../../server.ts returns 403 Forbidden', async () => {
    const res = await makeRequest('/assets/../../server.ts');
    expect(res.status).toBe(403);
    expect(res.body).toContain('Path Traversal Blocked');
  });

  it('GET /%E0%A4%A malformed URI encoding returns 400 Bad Request', async () => {
    const res = await makeRequest('/%E0%A4%A');
    expect(res.status).toBe(400);
    expect(res.body).toContain('Malformed URI');
  });

  it('GET with null byte returns 400 Bad Request', async () => {
    const res = await makeRequest('/index.html%00.js');
    expect(res.status).toBe(400);
    expect(res.body).toContain('Null Byte Detected');
  });

  // ─── 6. Caching & MIME Types ────────────────────────────────────────

  it('serves hashed assets in /assets/ with immutable Cache-Control', async () => {
    const res = await makeRequest('/assets/index-DZjWQXs4.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/css');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.body).toContain('margin: 0');
  });

  it('serves unhashed assets without immutable header', async () => {
    const res = await makeRequest('/images/hanoi-1946.jpg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(res.headers['cache-control']).not.toContain('immutable');
  });

  it('serves SVG with image/svg+xml MIME type', async () => {
    const res = await makeRequest('/images/logo.svg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/svg+xml');
  });

  it('serves font files with correct MIME types', async () => {
    const woffRes = await makeRequest('/fonts/inter.woff2');
    expect(woffRes.status).toBe(200);
    expect(woffRes.headers['content-type']).toBe('font/woff2');

    const ttfRes = await makeRequest('/fonts/roboto.ttf');
    expect(ttfRes.status).toBe(200);
    expect(ttfRes.headers['content-type']).toBe('font/ttf');
  });

  // ─── 7. Unsupported HTTP Methods ────────────────────────────────────

  it('POST / returns 405 Method Not Allowed', async () => {
    const res = await makeRequest('/', 'POST');
    expect(res.status).toBe(405);
    expect(res.headers['allow']).toBe('GET, HEAD');
  });

  // ─── 8. Dev Mode Preservation ───────────────────────────────────────

  it('preserves dev behavior (JSON status at root) when SERVE_CLIENT=0', async () => {
    const devHandler = createStaticRequestHandler({
      clientDistDir: tempDir,
      isServeClient: false,
      publicUrl: 'http://localhost:3001',
      getRoomCount: () => 1,
    });

    const devServer = http.createServer(devHandler);
    let devPort = 0;
    await new Promise<void>((resolve) => {
      devServer.listen(0, '127.0.0.1', () => {
        devPort = (devServer.address() as any).port;
        resolve();
      });
    });

    const res = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>(
      (resolve, reject) => {
        const req = http.request(
          { host: '127.0.0.1', port: devPort, path: '/', method: 'GET' },
          (r) => {
            let b = '';
            r.setEncoding('utf-8');
            r.on('data', (c) => (b += c));
            r.on('end', () => resolve({ status: r.statusCode ?? 0, headers: r.headers, body: b }));
          }
        );
        req.on('error', reject);
        req.end();
      }
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const data = JSON.parse(res.body);
    expect(data.status).toBe('ok');
    expect(data.publicUrl).toBe('http://localhost:3001');
    expect(data.rooms).toBe(1);

    await new Promise<void>((resolve) => devServer.close(() => resolve()));
  });

  // ─── 9. Default Dist Directory & RENDER_EXTERNAL_URL ─────────────────

  it('resolves default client/dist relative to module when clientDistDir is omitted', async () => {
    const prodHandler = createStaticRequestHandler({
      isServeClient: true,
      publicUrl: 'https://vnr202.onrender.com',
    });

    const prodServer = http.createServer(prodHandler);
    let prodPort = 0;
    await new Promise<void>((resolve) => {
      prodServer.listen(0, '127.0.0.1', () => {
        prodPort = (prodServer.address() as any).port;
        resolve();
      });
    });

    try {
      // When client is built, default resolution serves client/dist/index.html
      const res = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            { host: '127.0.0.1', port: prodPort, path: '/?room=TEST12', method: 'GET' },
            (r) => {
              let b = '';
              r.setEncoding('utf-8');
              r.on('data', (c) => (b += c));
              r.on('end', () => resolve({ status: r.statusCode ?? 0, headers: r.headers, body: b }));
            }
          );
          req.on('error', reject);
          req.end();
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');

    } finally {
      await new Promise<void>((resolve) => prodServer.close(() => resolve()));
    }
  });
});
