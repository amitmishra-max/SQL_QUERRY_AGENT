#!/usr/bin/env bash
# Start FastAPI for Playwright E2E (SQLite, no MySQL/Ollama required for auth UI tests).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

export APP_DATABASE_URL="${APP_DATABASE_URL:-sqlite+aiosqlite:///./e2e_app.db}"
export DEFAULT_TARGET_DB_URL="${DEFAULT_TARGET_DB_URL:-sqlite+aiosqlite:///./e2e_target.db}"
export SECRET_KEY="${SECRET_KEY:-e2e-secret-key-for-playwright-only}"
export ALGORITHM="${ALGORITHM:-HS256}"
export ACCESS_TOKEN_EXPIRE_MINUTES="${ACCESS_TOKEN_EXPIRE_MINUTES:-30}"
export LLM_PROVIDER="${LLM_PROVIDER:-llama}"
export GOOGLE_API_KEY="${GOOGLE_API_KEY:-e2e-dummy-google-key}"
export LLAMA_BASE_URL="${LLAMA_BASE_URL:-http://127.0.0.1:11434}"
export LLAMA_MODEL="${LLAMA_MODEL:-deepseek-coder:6.7b}"
export LLAMA_VERIFY_SSL="${LLAMA_VERIFY_SSL:-false}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export OPENAI_MODEL="${OPENAI_MODEL:-gpt-3.5-turbo}"
export MAX_QUERY_ROWS="${MAX_QUERY_ROWS:-100}"
export QUERY_TIMEOUT_SECONDS="${QUERY_TIMEOUT_SECONDS:-30}"
export MAX_QUESTION_LENGTH="${MAX_QUESTION_LENGTH:-5000}"

rm -f e2e_app.db e2e_target.db

python seed_e2e.py

exec python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
