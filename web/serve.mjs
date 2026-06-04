/**
 * Minimal static server for the Orrery playground (no dependencies).
 *
 * Run with `npm run web`, then open the printed URL. This exists because some
 * browsers block local file access from file:// URLs; serving over http avoids it.
 * It is a dev convenience only and never part of the core.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const PORT = process.env.PORT || 5173
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url || '/').split('?')[0])
    if (path === '/') path = '/index.html'
    const file = normalize(join(ROOT, path))
    if (file !== ROOT.slice(0, -1) && !file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
      res.writeHead(403).end('forbidden')
      return
    }
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(PORT, () => {
  console.log(`Orrery playground running at  http://localhost:${PORT}/`)
  console.log('Press Ctrl+C to stop.')
})
