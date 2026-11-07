# Starts the project on Windows (PowerShell): backend (8000), AI service (8001), frontend (5500).
# Needs: Python 3.12+ on PATH, PostgreSQL 14+ with the pgvector extension (psql on PATH).
# First run:  .\start.ps1 setup     (creates .env, venv, tables, sample data)
# Next runs:  .\start.ps1
# If scripts are blocked:  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
param([string]$Mode = "")
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"
$EnvFile = Join-Path $Backend ".env"
$Py = Join-Path $Backend ".venv\Scripts\python.exe"

function Get-DbUrl {
  $line = Get-Content $EnvFile -ErrorAction SilentlyContinue | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if ($line) { return ($line -replace '^DATABASE_URL=', '') -replace '\+psycopg', '' }
  return "postgresql://postgres:changeme@localhost:5432/nba_readiness"
}

function Test-Db {
  psql (Get-DbUrl) -Atc "select 1" *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Cannot reach PostgreSQL at: $(Get-DbUrl)" -ForegroundColor Red
    Write-Host "Install PostgreSQL + pgvector (see docs\USER_GUIDE.md, section 2), create the database nba_readiness,"
    Write-Host "and set DATABASE_URL in backend\.env. Make sure psql is on PATH."
    exit 1
  }
}

function Invoke-Setup {
  if (-not (Test-Path $EnvFile)) {
    (Get-Content (Join-Path $Backend ".env.example")) |
      ForEach-Object {
        $_ -replace '^DATABASE_URL=.*', 'DATABASE_URL=postgresql+psycopg://postgres:changeme@localhost:5432/nba_readiness' `
           -replace '^CORS_ORIGINS=.*', 'CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500' `
           -replace '^INITIAL_ADMIN_EMAIL=.*', 'INITIAL_ADMIN_EMAIL=admin@college.edu' `
           -replace '^INITIAL_ADMIN_PASSWORD=.*', 'INITIAL_ADMIN_PASSWORD=password123' `
           -replace '^INITIAL_HOD_EMAIL=.*', 'INITIAL_HOD_EMAIL=hod@college.edu' `
           -replace '^INITIAL_HOD_PASSWORD=.*', 'INITIAL_HOD_PASSWORD=password123'
      } | Set-Content $EnvFile
    Write-Host "Created backend\.env - edit the DATABASE_URL password if yours is not 'changeme'."
  }
  Test-Db
  psql (Get-DbUrl) -c "CREATE EXTENSION IF NOT EXISTS vector" | Out-Null
  Push-Location $Backend
  if (-not (Test-Path ".venv")) { python -m venv .venv }
  & $Py -m pip install -q -r requirements.txt -r ..\ai-service\requirements.txt
  & $Py -m alembic upgrade head
  & $Py -m app.db.seed_demo
  Pop-Location
}

function Start-All {
  Test-Db
  Start-Process -WorkingDirectory $Backend -FilePath $Py -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000"
  Start-Process -WorkingDirectory (Join-Path $Root "ai-service") -FilePath $Py -ArgumentList "-m","uvicorn","main:app","--host","127.0.0.1","--port","8001"
  Start-Process -WorkingDirectory (Join-Path $Root "frontend") -FilePath $Py -ArgumentList "-m","http.server","5500","--bind","127.0.0.1"
  Write-Host ""
  Write-Host "Open http://127.0.0.1:5500   (use 127.0.0.1, not localhost)"
  Write-Host "Admin   admin@college.edu / password123"
  Write-Host "HOD     hod@college.edu / password123"
  Write-Host "Faculty faculty1@college.edu / password123"
  Write-Host "Three windows opened (backend, AI service, frontend). Close them to stop."
}

if ($Mode -eq "setup") { Invoke-Setup }
Start-All
