// PM2 process manager config — keeps InstaBiz ERP running permanently.
// Auto-restarts on crash, survives terminal close, and (with pm2 save +
// startup) survives machine reboots.
//
// Usage:
//   pm2 start ecosystem.config.cjs   # start everything
//   pm2 save                         # remember running apps across reboot
//   pm2 status                       # see state
//   pm2 logs instabiz-frontend       # tail logs
//
// The frontend runs in DEMO_MODE (mock data) and needs no backend.
const path = require('path');
const FRONTEND = path.join(__dirname, 'frontend');

module.exports = {
  apps: [
    {
      name: 'instabiz-frontend',
      // Run vite's JS entry directly with node — avoids npm.cmd shell issues on Windows.
      script: path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js'),
      args: '--host --port 3000',
      cwd: FRONTEND,
      interpreter: 'node',
      autorestart: true,        // restart if it ever crashes
      max_restarts: 1000,
      restart_delay: 2000,      // wait 2s between restarts
      watch: false,
      env: { NODE_ENV: 'development' },
    },
  ],
};
