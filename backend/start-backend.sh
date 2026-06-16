#!/usr/bin/env bash
# Launcher for the InstaBiz FastAPI backend, supervised by PM2 (via wsl.exe).
# Runs uvicorn in the FOREGROUND so PM2 can monitor/restart it.

# Best-effort: bring up PostgreSQL if a passwordless sudo rule allows it.
# (If not permitted, we just wait for it to already be running.)
sudo -n service postgresql start >/dev/null 2>&1 || true

# Wait up to 60s for Postgres on 5433 before starting the API.
for i in $(seq 1 60); do
  if (exec 3<>/dev/tcp/127.0.0.1/5433) 2>/dev/null; then exec 3>&-; break; fi
  sleep 1
done

cd /mnt/c/Users/Idris/Desktop/CLAUDE/Erp/instabiz-erp-unified/backend || exit 1
export DATABASE_URL='postgresql+asyncpg://erp_user:erp_secure_password@127.0.0.1:5433/adhesive_erp'
export CORS_ORIGINS='*'
exec "$HOME/erp-venv/bin/python" -m uvicorn server:app --host 0.0.0.0 --port 8000
