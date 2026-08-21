// Dev host setup for `tauri android dev`.
//
// Strategy:
// 1. Prefer "adb reverse" over USB: the device reaches the dev server via 127.0.0.1,
//    bypassing Wi-Fi firewalls and AP isolation entirely.
// 2. Fall back to a LAN IP when no adb device is connected.
//
// This script must SPAWN the CLI itself: setting process.env here would not reach
// a sibling process started by npm.

import { execSync, spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

const DEV_PORT = 1430;

/** 检测已连接的 adb 设备，建立 adb reverse 隧道；成功返回 "127.0.0.1" */
function tryAdbReverse() {
  let devices;
  try {
    devices = execSync('adb devices', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter((line) => /^\S+\s+device(\s|$)/.test(line));
  } catch {
    return null;
  }
  if (devices.length === 0) {
    console.log('[dev-host] No adb device connected, falling back to LAN IP');
    return null;
  }
  try {
    execSync(`adb reverse tcp:${DEV_PORT} tcp:${DEV_PORT}`, { encoding: 'utf8', stdio: 'pipe' });
    console.log(
      `[dev-host] adb reverse tcp:${DEV_PORT} tcp:${DEV_PORT} established (device reaches dev server over USB)`,
    );
    return '127.0.0.1';
  } catch (e) {
    console.warn('[dev-host] adb reverse failed:', e.message);
    return null;
  }
}

/** 回退方案：检测 WiFi/LAN IP（跳过虚拟网卡与 VPN 保留网段） */
function findWifiIP() {
  const interfaces = networkInterfaces();
  const skipNames = /Loopback|VMware|Virtual|vEthernet|WSL|Hyper-?V|蓝牙|Bluetooth/i;
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs || skipNames.test(name)) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({ name, ip: addr.address });
      }
    }
  }
  // 优先 WiFi/WLAN 接口
  const wifi = candidates.find((c) => /WLAN|Wi-?Fi|无线/i.test(c.name));
  if (wifi) return wifi.ip;
  // 避开 VPN 保留网段（198.18/15、100.64/10、169.254/16、192.168.137/24 等）
  const plain = candidates.find(
    (c) => !/^(198\.18|100\.(6[4-9]|[7-9]\d)|169\.254|192\.168\.137)/.test(c.ip),
  );
  return plain ? plain.ip : (candidates[0]?.ip ?? null);
}

const host = tryAdbReverse() ?? findWifiIP();
const env = { ...process.env };
if (host) {
  env.TAURI_DEV_HOST = host;
  console.log(`[dev-host] Using TAURI_DEV_HOST=${host}`);
} else {
  console.log('[dev-host] No usable dev host found, keeping default');
}

// 注意：TAURI_DEV_HOST 环境变量在此 CLI 版本中不会被读取（default-route 网卡优先），
// 必须用隐藏的 --host 参数把开发主机传给 CLI（clap 参数，值需为 IP）。
const cliArgs = host ? ['tauri', 'android', 'dev', '--host', host] : ['tauri', 'android', 'dev'];
const cli = spawn('npx', cliArgs, {
  stdio: 'inherit',
  // Windows 上 .cmd 必须走 shell，否则 spawn EINVAL
  env,
  shell: process.platform === 'win32',
});
cli.on('exit', (code) => process.exit(code ?? 1));
cli.on('error', (err) => {
  console.error('[dev-host] Failed to spawn tauri CLI:', err.message);
  process.exit(1);
});
