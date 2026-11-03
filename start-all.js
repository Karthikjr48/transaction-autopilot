/**
 * Master Dual-Server Launcher
 * Simultaneously boots:
 * 1. PayPal Sandbox Backend Server on Port 5000
 * 2. PayPal UI Client on Port 3000
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('======================================================');
console.log('🚀 Starting PayPal Commerce Dual Architecture');
console.log('   • PayPal Sandbox Backend  : http://localhost:5000');
console.log('   • PayPal UI Client        : http://localhost:3000');
console.log('======================================================\n');

// 1. Launch Sandbox Backend on Port 5000
const backend = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, PORT: '5000' }
});

// 2. Launch UI Server on Port 3000
const frontend = spawn(process.execPath, [path.join(__dirname, 'ui-server.js')], {
  stdio: 'inherit',
  cwd: __dirname,
  env: { ...process.env, UI_PORT: '3000', BACKEND_URL: 'http://localhost:5000' }
});

const cleanup = () => {
  try { backend.kill(); } catch (_) {}
  try { frontend.kill(); } catch (_) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
