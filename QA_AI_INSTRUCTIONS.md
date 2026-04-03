# AI QA Tester Instructions — SQL Query Agent

> **Single source of truth** for automated testing on this repository.  
> Anyone (human or AI) adding or changing tests should read this file end-to-end, then read the relevant source before editing tests.

**Document maintenance:** When you add routes, rename components, or change API contracts, update **§1 (maps)**, **§4–5 (expected behaviors)**, or **§7 (file layout)** in the same PR. If implementation intentionally differs from an older test name in this doc, update the doc to match reality.

---

## 0. Testing strategy (industry baseline)

Use a **test pyramid** for fast feedback and maintainability:

| Layer | What it proves | Speed | Isolation |
|-------|----------------|-------|-----------|
| **Unit** | Pure logic (validation, parsing, token helpers) with no I/O | Fastest | Full mocks / no DB |
| **Service / API integration** | HTTP contract + app wiring with **in-memory SQLite** and **mocked external I/O** (LLM, target DB session factories where needed) | Medium | No real MySQL / no real LLM |
| **Frontend component** | UI behavior users see; query by role/label, not CSS | Fast | **MSW** (`src/mocks/`) + Vitest; reserve `vi.mock` for routers/third-party only where needed |
| **E2E** | Critical journeys in a real browser | Slowest | **Playwright** (`e2e/`) against Vite preview + FastAPI (`scripts/e2e-backend.sh`); CI runs Chromium |

**Principles**

1. **Deterministic:** Same input → same outcome; no dependence on wall clock, network, or test order unless unavoidable (then isolate with fixtures).
2. **Specify behavior, not implementation:** Prefer assertions on HTTP status + JSON shape, or on accessible labels, rather than internal state.
3. **Isolate external boundaries:** LLM providers, target MySQL, and third-party HTTP must not run in unit/API tests unless explicitly labeled “live” tests (this project does not use live tests in CI).
4. **AAA in every test:** Arrange → Act → Assert; one primary behavior per test (extra assertions that check the same outcome are fine).
5. **Fail loudly on contract drift:** If the app returns `200` for register today, tests and this document must say `200`, not an aspirational `201`, unless the API is changed and documented together.

---

## 1. Project overview and current architecture

**Name:** SQL Query Agent  

**Goal:** Full-stack app: natural-language questions → LLM-generated SQL (Ollama primary, Google GenAI fallback) → validated execution against a **target** MySQL schema → results and history in the UI.

### 1.1 Runtime architecture

```
┌──────────────┐     HTTP/JSON      ┌──────────────────────┐     MySQL      ┌──────────────────┐
│  React SPA   │ ◄─────────────────► │  FastAPI backend     │ ◄────────────► │  MySQL 8.0       │
│  (Vite)      │                     │  (Python 3.10+)      │                │  (app + target)  │
│  Port 3000   │     `/api` proxy    │  Port 8000           │                │                  │
└──────────────┘                     │  LLMService + agent  │                └──────────────────┘
                                     └──────────────────────┘
```

**Local dev:** `vite.config.js` serves the SPA on **port 3000** and proxies **`/api`** to **`http://127.0.0.1:8000`**. The Axios **`VITE_API_BASE_URL`** (default `http://127.0.0.1:8000`) must match the API origin used in E2E and production builds.

### 1.2 Two-database design

| Database (conceptual) | Purpose | Settings / env |
|------------------------|---------|----------------|
| **App DB** | Users, auth, `query_history` | `APP_DATABASE_URL` |
| **Target DB** | Data warehouse the generated SQL runs against | `DEFAULT_TARGET_DB_URL` (optional override per request in some flows) |

**Tests:** `conftest.py` sets both URLs to **`sqlite+aiosqlite://`** so integration tests do not require MySQL.

### 1.3 Backend module map (current)

| Area | Path | Responsibility |
|------|------|----------------|
| App entry | `app/main.py` | App instance, CORS, routers, startup |
| Auth API | `app/api/auth.py` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Query API | `app/api/query.py` | `POST /api/query/ask`, `POST /api/query/schema` |
| History API | `app/api/history.py` | History list, get by id, bookmark, delete |
| Config | `app/core/config.py` | `pydantic-settings` from env |
| Database | `app/core/database.py` | Async engines, sessions, `init_db` |
| Security | `app/core/security.py` | bcrypt, JWT, `get_current_user` |
| Models | `app/models/user.py`, `app/models/query_history.py` | SQLAlchemy models |
| Schemas | `app/schemas/user.py`, `app/schemas/query_history.py` | Pydantic request/response |
| LLM | `app/services/llm_service.py`, `app/services/llm_agent.py` | Prompting, provider calls, response parsing |
| Query execution | `app/services/query_service.py` | SQL allow/deny rules, execution |
| Schema introspection | `app/services/schema_service.py` | Target DB metadata |

**Auth contract note:** `POST /api/auth/register` returns **HTTP 200** with `UserResponse` on success (not `201`), unless the implementation is deliberately changed to use `status.HTTP_201_CREATED`.

### 1.4 Frontend module map (current)

| Area | Path | Responsibility |
|------|------|----------------|
| Entry / routes | `src/App.jsx` | `BrowserRouter`, protected routes, `AuthProvider` |
| Auth state | `src/context/AuthContext.jsx` | Token in `localStorage`, `login` / `logout` |
| HTTP | `src/services/api.js` | Axios client, `authAPI`, `queryAPI`, `historyAPI` |
| Login | `src/pages/Login.jsx` | Form, token + navigate to `/dashboard` |
| Register | `src/pages/Register.jsx` | Form, navigate to `/login` on success |
| Dashboard | `src/pages/Dashboard.jsx` | Question form, connection mode, history sidebar, explanation, **embeds** `Table` + `SchemaVisualization` |
| Results table | `src/pages/Table.jsx` | Tabular query results; duplicate column headers disambiguated |
| Schema graph | `src/pages/SchemaVisualization.jsx` | **React Flow** graph of tables/columns/FKs (`reactflow` dependency) |

**Removed / renamed:** There is **no** `src/pages/Schema.jsx`. List/table schema UI lives in **`SchemaVisualization.jsx`**. Tests must import the component that actually ships.

### 1.5 Implemented UI behaviors relevant to tests

- **`Table.jsx`:** Duplicate result column names: the **first** occurrence keeps the original name; **second and later** occurrences render as `name_2`, `name_3`, … in headers. **`null` / `undefined`** cell values render as an em dash **`—`** (not an empty string).
- **`Login.jsx`:** Submit button shows **`Signing in...`** while `loading` is true.

---

## 2. QA role

You are a **senior QA automation engineer** working in this repo:

1. Read **source** before writing or changing tests.
2. Use the **stack in §3**; if you introduce a new tool (e.g. MSW), add it to dependencies and document it here in the same change.
3. Mock **LLM** and **external DB** in backend tests; mock **HTTP** in frontend tests unless using a dedicated E2E environment.
4. Cover **happy paths, auth failures, validation errors, and malicious SQL** where applicable.
5. Keep tests **readable and independent** (fixtures in `conftest.py` for backend; `setup.js` + helpers for frontend).

---

## 3. Testing stack

### 3.1 Backend (adopted)

| Tool | Purpose |
|------|---------|
| `pytest` | Runner |
| `pytest-asyncio` | Async tests (`asyncio_mode = auto` in `pytest.ini`) |
| `httpx.AsyncClient` + `ASGITransport` | ASGI calls against the real FastAPI app |
| `unittest.mock` / `pytest-mock` | Patch LLM, target sessions, env |
| SQLite + `aiosqlite` | In-memory app DB via `APP_DATABASE_URL` in tests |

**Optional (not required today):** `respx` for httpx-level HTTP mocking if tests start calling real client code paths without patches.

### 3.2 Frontend (adopted)

| Tool | Purpose |
|------|---------|
| `vitest` | Runner (`vite.config.js` → `test.environment: 'jsdom'`) |
| `@testing-library/react` | Render and queries |
| `@testing-library/user-event` | Input and clicks |
| `msw` | HTTP mocking for **`Login`** / **`Register`** (and future API-heavy tests); `src/mocks/handlers.js` + `server.js`, wired in `src/__tests__/setup.js` |
| `vi.mock` | **`react-router-dom`** (`useNavigate`), **`react-toastify`**, and thin third-party shims only — not the API module. |

### 3.2a E2E (adopted in CI)

| Tool | Purpose |
|------|---------|
| `@playwright/test` | Root `package.json`; specs in **`e2e/`**, config **`playwright.config.ts`** |
| `scripts/e2e-backend.sh` | SQLite-backed FastAPI on **:8000** for browser tests |
| Route mocking in specs | **`/api/query/*`** and **`/api/history*`** where LLM or MySQL-specific schema would break determinism |

### 3.3 Commands (local / CI)

```bash
# Backend — install app + dev deps once
cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest

# Frontend unit/component
cd frontend && npm ci && npm run test && npm run build

# E2E (Linux/macOS/Git Bash — starts API + Vite preview; requires backend deps + frontend build)
# From repo root:
npm ci && cd frontend && npm ci && cd ..
npx playwright install chromium   # once per machine
npx playwright test
```

**CI (GitHub Actions):** `.github/workflows/ci.yml` jobs: **Backend (`pytest`)**, **Frontend (`vitest` + `vite build`)**, **E2E (`playwright test`, Chromium)**. Require these checks in branch protection; see **`.github/BRANCH_PROTECTION.md`** for GitHub UI steps (settings cannot be committed).

---

## 4. Backend — behaviors to cover

Tests live in `backend/tests/`. Names may differ slightly; **behaviors** below are the contract.

### 4A. Unit tests

#### `test_security.py` — `app/core/security.py`

- Hash + verify password; wrong password fails.
- Password length policy: over max length raises (and exact boundary if applicable).
- JWT: `sub`, `exp`, custom expiry, decode success; invalid / expired → `None`.

#### `test_query_service.py` — `app/services/query_service.py`

- Allowed: simple `SELECT`, trailing semicolon, typical joins (if supported).
- Rejected: non-SELECT DML/DDL patterns, dangerous keywords, multiple statements, semicolon mid-query tricks, empty query.

#### `test_llm_service.py` — `app/services/llm_service.py`

- Parse clean JSON; JSON in markdown fences; JSON embedded in prose; unparseable → error.
- `format_schema` readable output; `build_prompt` includes question + schema (and any documented safety text).

### 4B. API integration tests

Use the async client fixture; authenticated routes need **`Authorization: Bearer …`** from fixtures.

#### `test_auth_api.py`

- Register new user: **success status matches implementation** (currently **200**); response body includes expected fields.
- Duplicate email → **400**.
- Password policy violation → **400** or **422** (document which the API returns).
- Login: valid credentials → **200**, `access_token` + `token_type`; wrong password / unknown user → **401**.
- `GET /api/auth/me`: valid token → **200**; missing token → **401**; **invalid** token → **401**; **expired** JWT → **401** (`test_get_me_with_expired_token_returns_401`).

#### `test_query_api.py`

- `POST /api/query/ask` without auth → **401** (`test_ask_question_requires_auth`); combined with schema in `test_query_endpoints_require_authentication`.
- With auth + mocks: LLM returns valid SQL → **200** and result payload shape (`test_ask_question_returns_sql_and_results`).
- LLM returns forbidden SQL → error surfaced in response body (`test_ask_question_with_invalid_sql_returns_error`).
- LLM failure path (empty SQL / provider error payload) → error in body (`test_ask_question_when_llm_returns_empty_sql`). Optional extension: timeout/network via `httpx` mocking.
- **Persist history:** after a successful ask, `query_history` row count increases (`test_ask_question_saves_to_history`).
- `POST /api/query/schema` without auth → **401**; with auth + mocks → **200** and `tables` in JSON (`test_schema_endpoint_returns_tables`).

#### `test_history_api.py`

- List scoped to user; bookmark filter; get by id; 404 for missing id; bookmark toggle; delete; cross-user access denied (404 or 403 per API).

---

## 5. Frontend — behaviors to cover

Tests live in `frontend/src/__tests__/`. Prefer **`getByRole`**, **`getByLabelText`**, or stable text only when accessible.

### 5A. Components

#### `Table.test.jsx` — `src/pages/Table.jsx`

- Row count matches data (header may state “Results (N rows)”).
- Column headers match; **duplicate columns:** assert **`name`** and **`name_2`** (not `name_1`) for two `"name"` columns.
- Null cells show **`—`**.
- Empty `result` with defined `response` → **“No results found.”**
- `response === null` → no crash / minimal output per implementation.

#### `Schema.test.jsx` — `src/pages/SchemaVisualization.jsx`

- File name is historical; the suite targets **`SchemaVisualization`** (React Flow). Covers table labels, columns/types in the graph DOM, PK marker, and empty/null schema copy.

#### `Login.test.jsx`

- Email + password fields; link to register.
- Failed login shows API error message.
- Loading: button shows **`Signing in...`** while request pending (use slow/mock pending promise).
- Success: **`navigate('/dashboard')`** called (mock `useNavigate`) **and/or** auth context receives token—assert the user-visible outcome you care about.

#### `Register.test.jsx`

- Fields + submit; duplicate email error; loading state if implemented.
- Success: **`navigate('/login')`** (mock `useNavigate`).

### 5B. Context and routing

#### `AuthContext.test.jsx`

- No token → unauthenticated; token in `localStorage` → authenticated.
- `login` / `logout` persist state and storage as implemented.

#### `App.test.jsx`

- Unauthenticated: root and `/dashboard` redirect or show login as implemented.
- Authenticated: dashboard reachable; visiting `/login` redirects to dashboard if that is the product rule.

---

## 6. End-to-end and release smoke

**Automated (primary):** Playwright specs under **`e2e/`** cover:

- **`auth-journey.spec.ts`:** register → login → dashboard → logout; login redirect when already authenticated.  
- **`dashboard-query.spec.ts`:** register/login, mocked **`/api/query/schema`** + **`/api/query/ask`**, assert results + explanation.  
- **`history-bookmark.spec.ts`:** mocked **`/api/history`**, bookmark toggle + star styling.

**Manual / exploratory** (after deploy or for UX not asserted in Playwright):

1. Real Ollama / Gemini paths and latency.  
2. Real MySQL target DB and `INFORMATION_SCHEMA` schema graph.  
3. Session expiry toast + redirect in a long-lived tab.  
4. Accessibility, visual regression, and mobile layouts.

---

## 7. Repository layout for tests

```
SQL_QUERY_AGENT/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                # pytest + vitest + build + Playwright
│   └── BRANCH_PROTECTION.md      # how to require CI on GitHub
├── e2e/
│   ├── auth-journey.spec.ts
│   ├── dashboard-query.spec.ts
│   └── history-bookmark.spec.ts
├── scripts/
│   └── e2e-backend.sh            # FastAPI + SQLite for E2E
├── playwright.config.ts
├── package.json                  # @playwright/test (root)
├── backend/
│   ├── pytest.ini
│   ├── requirements.txt          # application runtime deps
│   ├── requirements-dev.txt      # pytest, pytest-asyncio, aiosqlite (CI + local dev)
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py           # Env, SQLite URLs, AsyncClient, auth_user, auth_headers
│       ├── test_security.py
│       ├── test_query_service.py
│       ├── test_llm_service.py
│       ├── test_auth_api.py
│       ├── test_query_api.py
│       └── test_history_api.py
├── frontend/
│   ├── vite.config.js            # test: jsdom, setupFiles
│   └── src/
│       ├── mocks/
│       │   ├── handlers.js       # MSW default handlers
│       │   └── server.js
│       ├── __tests__/
│       │   ├── setup.js          # MSW, cleanup, localStorage mock
│       │   ├── Table.test.jsx
│       │   ├── Schema.test.jsx   # tests SchemaVisualization.jsx
│       │   ├── Login.test.jsx
│       │   ├── Register.test.jsx
│       │   ├── AuthContext.test.jsx
│       │   └── App.test.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Table.jsx
│           └── SchemaVisualization.jsx
└── QA_AI_INSTRUCTIONS.md         # this file
```

---

## 8. Coding rules (summary)

1. **AAA** everywhere.  
2. **No real secrets** in tests; use dummy keys in env (see `conftest.py` pattern).  
3. **No real LLM or production MySQL** in default test runs.  
4. **Idempotent:** backend uses isolated DB state via fixtures/transactions as implemented.  
5. **Names:** `test_<behavior>_<condition>_<expected>`.  
6. **Frontend:** avoid `container.querySelector` for things users don’t see; prefer Testing Library queries.  
7. **When touching APIs:** update OpenAPI expectations in tests and **§4B** in this doc.

---

## 9. How to use this document

1. Paste or attach this file when asking an AI to write tests.  
2. Specify the module (e.g. “`query_api` only” or “fix `Table` duplicate-column test”).  
3. After changes, run **`pytest`**, **`npm run test`** (in `frontend/`), and **`npx playwright test`** (from repo root when E2E-relevant); update this doc if contracts or filenames changed.

**Example prompt:**  
> Read `QA_AI_INSTRUCTIONS.md` and `app/api/query.py`. Add `test_ask_question_persists_history` and `test_schema_returns_tables_when_authenticated`, using existing fixtures.
