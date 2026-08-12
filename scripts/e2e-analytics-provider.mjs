import { createServer } from 'node:http';

const port = Number(process.env.OOOPS_ANALYTICS_E2E_PORT || 4402);
const script = `
(() => {
  document.cookie = 'umami.e2e=active; Path=/; SameSite=Lax';
  localStorage.setItem('umami.e2e', 'active');
  sessionStorage.setItem('umami.e2e', 'active');
  window.umami = {
    clear: () => { window.__umamiClearCalled = true; },
    reset: () => { window.__umamiResetCalled = true; },
    track: () => fetch('http://127.0.0.1:${port}/collect', { method: 'POST', keepalive: true }).catch(() => undefined)
  };
  window.umami.track('pageview');
})();
`;

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end('ok');
    return;
  }
  if (request.url === '/umami.js') {
    response.writeHead(200, {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store'
    });
    response.end(script);
    return;
  }
  if (request.url === '/collect') {
    response.writeHead(204);
    response.end();
    return;
  }
  response.writeHead(404);
  response.end('not found');
});

server.listen(port, '127.0.0.1');
const close = () => server.close(() => process.exit(0));
process.once('SIGINT', close);
process.once('SIGTERM', close);
