import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export interface StaticOptions {
  clientDistDir?: string;
  isServeClient?: boolean;
  publicUrl?: string;
  getRoomCount?: () => number;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * Returns true if the requested URL path represents an asset
 * rather than an SPA client route.
 */
function isAssetPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/index.html') {
    return false;
  }
  if (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/static/')
  ) {
    return true;
  }
  const ext = path.extname(pathname).toLowerCase();
  return ext.length > 0;
}

/**
 * Identifies whether an asset file name carries a content hash.
 * In Vite builds, assets under dist/assets have content hashes (e.g. index-DZjWQXs4.css).
 */
function isHashedAsset(filePath: string, pathname: string): boolean {
  if (pathname.startsWith('/assets/')) {
    return true;
  }
  const base = path.basename(filePath);
  return /[-_.][a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9]+$/.test(base);
}

/**
 * Creates a request listener for serving static files, SPA fallback,
 * and /health in production, or fallback JSON in development.
 */
export function createStaticRequestHandler(options?: StaticOptions): http.RequestListener {
  const defaultDistDir = path.resolve(__dirname, '../../client/dist');

  return (req: http.IncomingMessage, res: http.ServerResponse): void => {
    const isServeClient =
      options?.isServeClient !== undefined
        ? options.isServeClient
        : process.env.SERVE_CLIENT === '1';

    const distDir = path.resolve(
      options?.clientDistDir ?? process.env.CLIENT_DIST_DIR ?? defaultDistDir
    );

    const publicUrl =
      options?.publicUrl ??
      process.env.PUBLIC_URL ??
      process.env.RENDER_EXTERNAL_URL ??
      'http://localhost:3001';

    const getRoomCount = options?.getRoomCount ?? (() => 0);

    // If SERVE_CLIENT is not active, preserve existing dev health/root behavior
    if (!isServeClient) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'Giu vung can cu Game Server',
          publicUrl,
          rooms: getRoomCount(),
          timestamp: Date.now(),
        })
      );
      return;
    }

    // Socket.IO paths are handled by Socket.IO; do nothing here
    if (req.url && req.url.startsWith('/socket.io/')) {
      return;
    }

    // Method check: only GET and HEAD are permitted for static/health routes
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Allow': 'GET, HEAD',
      });
      res.end('Method Not Allowed');
      return;
    }

    // Check raw path traversal before WHATWG URL normalizes segments
    const rawUrl = req.url || '/';
    const rawPathOnly = rawUrl.split('?')[0];
    if (
      /(?:^|[/\\])\.\.(?:[/\\]|$)/.test(rawPathOnly) ||
      /(?:%2e|\.){2,}(?:%2f|\/|%5c|\\|$)/i.test(rawPathOnly)
    ) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden: Path Traversal Blocked');
      return;
    }

    // URL parsing
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl, 'http://localhost');
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    // Malformed encoded paths -> 400
    let pathname: string;
    try {
      pathname = decodeURIComponent(parsedUrl.pathname);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request: Malformed URI');
      return;
    }

    // Null byte protection
    if (pathname.includes('\0')) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request: Null Byte Detected');
      return;
    }

    // Production health endpoint: returns JSON status
    if (pathname === '/health' || pathname === '/health/') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'Giu vung can cu Game Server',
          publicUrl,
          rooms: getRoomCount(),
          timestamp: Date.now(),
        })
      );
      return;
    }

    // Unknown API endpoints return 404 JSON, not SPA index.html
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      res.writeHead(404, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
      return;
    }

    // Path traversal protection
    const cleanRelPath = pathname.replace(/^[/\\]+/, '');
    const targetPath = path.resolve(distDir, cleanRelPath);

    if (targetPath !== distDir && !targetPath.startsWith(distDir + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden: Path Traversal Blocked');
      return;
    }

    // Determine target file to serve
    let filePathToServe: string | null = null;
    let isSpaFallback = false;

    try {
      const stat = fs.statSync(targetPath);
      if (stat.isFile()) {
        filePathToServe = targetPath;
      } else if (stat.isDirectory()) {
        const potentialIndex = path.join(targetPath, 'index.html');
        if (fs.existsSync(potentialIndex) && fs.statSync(potentialIndex).isFile()) {
          filePathToServe = potentialIndex;
        }
      }
    } catch {
      // File does not exist
    }

    if (!filePathToServe) {
      if (isAssetPath(pathname)) {
        // Missing static asset -> 404 (do NOT fallback to index.html)
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end('Not Found');
        }
        return;
      }

      // Non-asset route -> SPA fallback to root index.html
      const rootIndex = path.join(distDir, 'index.html');
      try {
        if (fs.existsSync(rootIndex) && fs.statSync(rootIndex).isFile()) {
          filePathToServe = rootIndex;
          isSpaFallback = true;
        }
      } catch {
        // Root index doesn't exist
      }
    }

    if (!filePathToServe) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end('Not Found: Client build not available');
      }
      return;
    }

    // Read stat for Content-Length and Last-Modified
    let fileStat: fs.Stats;
    try {
      fileStat = fs.statSync(filePathToServe);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    // MIME type resolution
    const ext = path.extname(filePathToServe).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cache-Control headers
    let cacheControl = 'no-cache';
    if (!isSpaFallback && isHashedAsset(filePathToServe, pathname)) {
      cacheControl = 'public, max-age=31536000, immutable';
    } else if (ext === '.html' || isSpaFallback) {
      cacheControl = 'no-cache, no-store, must-revalidate';
    } else {
      cacheControl = 'public, max-age=3600';
    }

    const headers: http.OutgoingHttpHeaders = {
      'Content-Type': mimeType,
      'Content-Length': fileStat.size,
      'Last-Modified': fileStat.mtime.toUTCString(),
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
    };

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    res.writeHead(200, headers);
    const readStream = fs.createReadStream(filePathToServe);
    readStream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Internal Server Error');
    });
    readStream.pipe(res);
  };
}
