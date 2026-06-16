// PM2 process manager config — keeps InstaBiz ERP running permanently.
// Auto-restarts on crash, survives terminal close, and (with pm2 save +
// startup) survives machine reboots.
//
// Usage:
//   pm2 start ecosystem.config.cjs   # start everything
//   pm2 save                         # remember running apps across reboot
//   pm2 status                       # see state
//   pm2 logs instabiz-frontend       # tail frontend logs
//   pm2 logs instabiz-backend        # tail backend logs
//
// Frontend: Vite on :3000 (Windows/node). Live mode → talks to the backend.
// Backend:  FastAPI on :8000, runs INSIDE WSL (python3 + erp-venv + Postgres).
//           PM2 supervises it through wsl.exe + start-backend.sh.
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
    {
      name: 'instabiz-backend',
      // PM2 (Windows) supervises the FastAPI server running inside WSL.
      // start-backend.sh waits for Postgres (:5433) then exec's uvicorn (:8000).
      script: 'C:\\Windows\\System32\\wsl.exe',
      args: 'bash /mnt/c/Users/Idris/Desktop/CLAUDE/Erp/instabiz-erp-unified/backend/start-backend.sh',
      interpreter: 'none',      // wsl.exe is a native binary, not a node script
      autorestart: true,
      max_restarts: 1000,
      restart_delay: 3000,
      watch: false,
    },
  ],
};
