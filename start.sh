#!/usr/bin/env bash
# Starts the whole project: database, backend (8000), AI service (8001), frontend (5500).
# First run:  ./start.sh setup     (installs packages, creates tables, loads sample data)
# Next runs:  ./start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="${PYTHON:-python3}"

db_up() {
  if ! docker ps --format '{{.Names}}' | grep -q '^nba-pg$'; then
    docker start nba-pg >/dev/null 2>&1 || docker run -d --name nba-pg \
      -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=nba_readiness \
      -p 5433:5432 pgvector/pgvector:pg16 >/dev/null
    echo "Waiting for database..."; sleep 6
  fi
}

setup() {
  cd "$ROOT/backend"
  [ -d .venv ] || "$PY" -m venv .venv
  .venv/bin/pip install -q -r requirements.txt -r ../ai-service/requirements.txt
  [ -f .env ] || sed -e 's#localhost:5432#localhost:5433#' \
    -e 's#^CORS_ORIGINS=.*#CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500#' \
    -e 's#^INITIAL_ADMIN_EMAIL=.*#INITIAL_ADMIN_EMAIL=admin@college.edu#' \
    -e 's#^INITIAL_ADMIN_PASSWORD=.*#INITIAL_ADMIN_PASSWORD=password123#' \
    -e 's#^INITIAL_HOD_EMAIL=.*#INITIAL_HOD_EMAIL=hod@college.edu#' \
    -e 's#^INITIAL_HOD_PASSWORD=.*#INITIAL_HOD_PASSWORD=password123#' .env.example > .env
  .venv/bin/alembic upgrade head
  .venv/bin/python -m app.db.seed_demo
}

run() {
  db_up
  cd "$ROOT/backend";    .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 &
  cd "$ROOT/ai-service"; ../backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 &
  cd "$ROOT/frontend";   "$PY" -m http.server 5500 --bind 127.0.0.1 &
  echo; echo "Open http://127.0.0.1:5500   (use 127.0.0.1, not localhost)"
  echo "Admin  admin@college.edu / password123"
  echo "HOD    hod@college.edu / password123"
  echo "Faculty faculty1@college.edu / password123"
  trap 'kill $(jobs -p) 2>/dev/null' INT TERM
  wait
}

db_up
[ "${1:-}" = "setup" ] && setup
run
