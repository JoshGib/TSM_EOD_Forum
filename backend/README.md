# Backend API

FastAPI service for the forum application: authentication, threads, comments, moderation, and reporting. Data is stored in PostgreSQL and managed with SQLAlchemy and Alembic migrations.

## Prerequisites

- **Python** — Use the version required by the main project documentation (Python 3.11 is specified for ML-related tooling in the repository root).
- **PostgreSQL** — A reachable instance and a valid connection string (the stack uses `psycopg2`).

## Environment variables

Create a `.env` file in this directory (`backend/`). Do not commit real credentials.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLAlchemy URL, e.g. `postgresql+psycopg2://user:password@host:5432/dbname?sslmode=require` |
| `SEED_ADMIN_EMAIL` | No | Email for the bootstrap admin user (default: `admin@example.com`) |
| `SEED_ADMIN_USERNAME` | No | Username for the bootstrap admin (default: `admin`) |
| `SEED_ADMIN_PASSWORD` | No | Plain-text password for the bootstrap admin (default: `password`) |

Obtain production or shared `DATABASE_URL` values through your team’s usual secret channel (password manager, env template, or maintainer)—never hard-code them in source control.

## Setup

1. **Virtual environment (recommended)**

   ```bash
   python -m venv venv
   ```

   Activate it (Windows: `venv\Scripts\activate`; macOS/Linux: `source venv/bin/activate`).

2. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Database migrations**

   From `backend/`, run:

   ```bash
   alembic upgrade head
   ```

   Ensure Alembic is pointed at the same database you use in `.env` (see `alembic/env.py` and `sqlalchemy.url` in `alembic.ini`). Use placeholders in version control and keep real URLs in `.env` or local-only `alembic.ini` overrides.

4. **Run the API**

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   - Health check: `GET http://localhost:8000/`
   - Interactive docs: `http://localhost:8000/docs` (Swagger UI)

## Bootstrap administrator

On startup, the app creates an admin user if one with the configured seed email does not exist. Defaults:

- **Email:** `admin@example.com`
- **Username:** `admin`
- **Password:** `password`

Override these in production with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_USERNAME`, and `SEED_ADMIN_PASSWORD` in `.env`.

## Project layout (high level)

| Path | Role |
|------|------|
| `main.py` | FastAPI app, CORS, routers, startup seeding |
| `db.py` | Engine, session, `DATABASE_URL` from environment |
| `models.py` | SQLAlchemy models |
| `routes/` | HTTP routers (auth, threads, comments, admin, reports, blacklist) |
| `alembic/` | Migration scripts |

## Related documentation

See the repository root `README.md` for full-stack setup, including ML components and frontend configuration.
