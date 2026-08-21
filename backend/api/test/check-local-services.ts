async function checkServices() {
  const endpoints = [
    { name: 'Public Web App', url: 'http://localhost:3000' },
    { name: 'Admin Portal', url: 'http://localhost:3001' },
    { name: 'Judges App', url: 'http://localhost:3002' },
    { name: 'Stage Display', url: 'http://localhost:3003' },
    { name: 'Contestant Portal', url: 'http://localhost:3004' },
    { name: 'Backend API Health', url: 'http://localhost:4000/health' },
  ];

  console.log('====================================================');
  console.log('CHECKING ALL LOCAL SERVICES (PORTS 3000-3004, 4000)');
  console.log('====================================================');

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(6000) });
      console.log(`✓ ${ep.name.padEnd(22)} (${ep.url.padEnd(30)}): [HTTP ${res.status}]`);
    } catch (err: any) {
      console.error(`✗ ${ep.name.padEnd(22)} (${ep.url.padEnd(30)}): FAILED (${err.message})`);
    }
  }
}

checkServices();
