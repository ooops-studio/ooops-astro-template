// The public JS API keeps Playwright's server in this process, independent of
// Astro CLI agent detection. Playwright owns startup and termination.
import {preview} from 'astro'
const port = Number(process.argv[2] ?? '4405')
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port')
const server = await preview({server: {host: '127.0.0.1', port, open: false}})
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await server.stop()
}
process.once('SIGTERM', () => { void stop() })
process.once('SIGINT', () => { void stop() })
await server.closed()
