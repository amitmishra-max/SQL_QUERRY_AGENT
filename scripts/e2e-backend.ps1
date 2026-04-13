# Start FastAPI for Playwright E2E (SQLite, no MySQL/Ollama required for auth UI tests).
# Equivalent to e2e-backend.sh for Windows PowerShell

$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
cd "$ROOT\backend"

$env:APP_DATABASE_URL = if ($env:APP_DATABASE_URL) { $env:APP_DATABASE_URL } else { "sqlite+aiosqlite:///./e2e_app.db" }
$env:DEFAULT_TARGET_DB_URL = if ($env:DEFAULT_TARGET_DB_URL) { $env:DEFAULT_TARGET_DB_URL } else { "sqlite+aiosqlite:///./e2e_target.db" }
$env:SECRET_KEY = if ($env:SECRET_KEY) { $env:SECRET_KEY } else { "e2e-secret-key-for-playwright-only" }
$env:ALGORITHM = if ($env:ALGORITHM) { $env:ALGORITHM } else { "HS256" }
$env:ACCESS_TOKEN_EXPIRE_MINUTES = if ($env:ACCESS_TOKEN_EXPIRE_MINUTES) { $env:ACCESS_TOKEN_EXPIRE_MINUTES } else { "30" }
$env:LLM_PROVIDER = if ($env:LLM_PROVIDER) { $env:LLM_PROVIDER } else { "llama" }
$env:GOOGLE_API_KEY = if ($env:GOOGLE_API_KEY) { $env:GOOGLE_API_KEY } else { "e2e-dummy-google-key" }
$env:LLAMA_BASE_URL = if ($env:LLAMA_BASE_URL) { $env:LLAMA_BASE_URL } else { "http://127.0.0.1:11434" }
$env:LLAMA_MODEL = if ($env:LLAMA_MODEL) { $env:LLAMA_MODEL } else { "deepseek-coder:6.7b" }
$env:LLAMA_VERIFY_SSL = if ($env:LLAMA_VERIFY_SSL) { $env:LLAMA_VERIFY_SSL } else { "false" }
$env:OPENAI_API_KEY = if ($env:OPENAI_API_KEY) { $env:OPENAI_API_KEY } else { "" }
$env:OPENAI_MODEL = if ($env:OPENAI_MODEL) { $env:OPENAI_MODEL } else { "gpt-3.5-turbo" }
$env:MAX_QUERY_ROWS = if ($env:MAX_QUERY_ROWS) { $env:MAX_QUERY_ROWS } else { "100" }
$env:QUERY_TIMEOUT_SECONDS = if ($env:QUERY_TIMEOUT_SECONDS) { $env:QUERY_TIMEOUT_SECONDS } else { "30" }
$env:MAX_QUESTION_LENGTH = if ($env:MAX_QUESTION_LENGTH) { $env:MAX_QUESTION_LENGTH } else { "5000" }

Remove-Item -Force e2e_app.db -ErrorAction SilentlyContinue
Remove-Item -Force e2e_target.db -ErrorAction SilentlyContinue

python seed_e2e.py

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000