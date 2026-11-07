#!/usr/bin/env bash
# Starts the project: backend (8000), AI service (8001), frontend (5500). No Docker needed.
# Needs PostgreSQL 14+ with the pgvector extension, reachable at DATABASE_URL in backend/.env.
# First run:  ./start.sh setup     (installs packages, creates the database and tables, loads sample data)
# Next runs:  ./start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PY="${PYTHON:-python3}"
DB_URL_DEFAULT="postgresql://postgres:changeme@localhost:5432/nba_readiness"

db_url() {  # plain libpq URL from backend/.env (strips the +psycopg driver suffix)
  local u; u="$(grep -E '^DATABASE_URL=' "$ROOT/backend/.env" 2>/dev/null | head -1 | cut -d= -f2-)"
  echo "${u:-$DB_URL_DEFAULT}" | sed 's#+psycopg##'
}

check_db() {
  if ! psql "$(db_url)" -Atc "select 1" >/dev/null 2>&1; then
    echo "Cannot reach PostgreSQL at: $(db_url)"
    echo "Install and start it (macOS):  brew install postgresql@17 pgvector && brew services start postgresql@17"
    echo "Then create the database:      createdb nba_readiness   and set DATABASE_URL in backend/.env"
    exit 1
  fi
}

setup() {
  cd "$ROOT/backend"
  [ -f .env ] || sed -e "s#^DATABASE_URL=.*#DATABASE_URL=postgresql+psycopg://postgres:changeme@localhost:5432/nba_readiness#" \
    -e 's#^CORS_ORIGINS=.*#CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500#' \
    -e 's#^INITIAL_ADMIN_EMAIL=.*#INITIAL_ADMIN_EMAIL=admin@college.edu#' \
    -e 's#^INITIAL_ADMIN_PASSWORD=.*#INITIAL_ADMIN_PASSWORD=password123#' \
    -e 's#^INITIAL_HOD_EMAIL=.*#INITIAL_HOD_EMAIL=hod@college.edu#' \
    -e 's#^INITIAL_HOD_PASSWORD=.*#INITIAL_HOD_PASSWORD=password123#' .env.example > .env
  check_db
  psql "$(db_url)" -c "CREATE EXTENSION IF NOT EXISTS vector" >/dev/null
  [ -d .venv ] || "$PY" -m venv .venv
  .venv/bin/pip install -q -r requirements.txt -r ../ai-service/requirements.txt
  .venv/bin/alembic upgrade head
  .venv/bin/python -m app.db.seed_demo
}

run() {
  check_db
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

[ "${1:-}" = "setup" ] && setup
run
