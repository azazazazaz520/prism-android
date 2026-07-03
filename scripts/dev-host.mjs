// Auto-detect WiFi IP and export TAURI_DEV_HOST for Tauri Android dev
// Falls back to localhost if no suitable IP found

import { networkInterfaces } from 'node:os';

function findWifiIP() {
  const interfaces = networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    // Skip virtual, loopback, and VMware adapters
    if (name.includes('Loopback') || name.includes('VMware') || name.includes('Virtual')) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

const ip = findWifiIP();
if (ip) {
  process.env.TAURI_DEV_HOST = ip;
  console.log(`[dev-host] Using TAURI_DEV_HOST=${ip}`);
} else {
  console.log('[dev-host] No WiFi IP found, using default');
}
