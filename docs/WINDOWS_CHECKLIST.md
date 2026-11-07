---
title: "Moving the project to the HP (Windows) laptop: checklist"
---

Follow in order. Each step says what you should see.

1. **Install Python 3.12 or newer** from python.org. Tick **Add python.exe to PATH**. Check: open PowerShell and run `py -3 --version`.
2. **Install PostgreSQL 16 or newer** from postgresql.org. Remember the `postgres` password. Add its `bin` folder (for example `C:\Program Files\PostgreSQL\17\bin`) to PATH. Check: `psql --version`.
3. **Add pgvector.** The Windows installer does not include it. Follow the "Windows" steps at github.com/pgvector/pgvector. Check later: `CREATE EXTENSION vector;` runs without error.
4. **Create the database:** `createdb -U postgres nba_readiness`
5. **Copy the project folder** to the laptop (or `git clone`). Folder names with spaces are fine.
6. **First run:** open PowerShell in the project folder and run `.\start.ps1 setup`.
   - If it says scripts are blocked, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
   - If your `postgres` password is not `changeme`, edit `DATABASE_URL` in `backend\.env`, then run `.\start.ps1 setup` again.
   - Check: it ends with "Setup finished" and opens three windows.
7. **Open http://127.0.0.1:5500** (not localhost). Sign in as `hod@college.edu` / `password123`.
8. **Check it matches the Mac:** open **Criterion 5** and click **Evaluate Criterion 5**. You should see **80 / 100**. Criterion 4 shows about **18 / 120**, Criterion 6 about **24 / 120**, Criterion 3 about **10 / 120**.
9. **AI review buttons:** open `ai-service\.env`, paste your Groq key after `GROQ_API_KEY=`, close the AI service window and run `.\start.ps1` again.
10. **Next time:** `.\start.ps1` (no `setup`).

**Bring this laptop's data across** (optional): see the "Bring the data to another laptop" steps (database dump plus the `backend\documents\uploads` folder).

**Run the tests on Windows** (optional): in `backend`, run `.\.venv\Scripts\python -m pytest -q`. They use a temporary in-memory database and do not touch your data.
