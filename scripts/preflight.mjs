const endpoints = [
  { name: 'WS', url: process.env.WS_HTTP_URL || 'http://localhost:4001/health' },
  { name: 'Bridge', url: process.env.BRIDGE_HTTP_URL || 'http://localhost:4002/health' }
];

console.log('EzPlay preflight: checking optional local services...');
for (const item of endpoints) {
  try {
    const res = await fetch(item.url, { signal: AbortSignal.timeout(500) });
    console.log(`${item.name}: ${res.ok ? 'ok' : `not ready (${res.status})`}`);
  } catch {
    console.log(`${item.name}: offline (this is expected before pnpm dev starts all apps).`);
  }
}
console.log('Tip: Use `pnpm dev` at repo root for full system. Running apps/web alone shows disconnected placeholders.');
