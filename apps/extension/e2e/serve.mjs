import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), 'static');
const PORT = 5190;
const TYPES = { '.html': 'text/html', '.mp4': 'video/mp4', '.js': 'text/javascript' };

createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  const file = path === '/' ? 'video.html' : path.replace(/^\//, '');
  try {
    const body = await readFile(join(root, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`test video page: http://127.0.0.1:${PORT}/video.html`));
