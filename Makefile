.PHONY: help install db db-stop backend frontend dev dev-stop test clean

# Load .env if it exists
-include .env
export

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Setup ──

install: ## Install all dependencies (backend + frontend)
	cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
	cd frontend && npm install

# ── Database (Docker) ──

db: ## Start PostgreSQL in Docker
	docker run -d --name violeta-db \
		-e POSTGRES_DB=violeta \
		-e POSTGRES_USER=violeta \
		-e POSTGRES_PASSWORD=violeta \
		-p 5432:5432 \
		-v violeta-pgdata:/var/lib/postgresql/data \
		postgres:16 || docker start violeta-db
	@echo "PostgreSQL running on localhost:5432"

db-stop: ## Stop PostgreSQL container
	docker stop violeta-db 2>/dev/null || true

# ── Backend ──

backend: ## Start FastAPI backend (port 8000)
	cd backend && source .venv/bin/activate && \
		DATABASE_URL="postgresql+asyncpg://violeta:violeta@localhost:5432/violeta" \
		JWT_SECRET="dev-secret-change-in-production" \
		FRONTEND_URL="http://localhost:5173" \
		GOOGLE_CLIENT_ID="$(GOOGLE_CLIENT_ID)" \
		GOOGLE_CLIENT_SECRET="$(GOOGLE_CLIENT_SECRET)" \
		uvicorn app.main:app --reload --port 8000

# ── Frontend ──

frontend: ## Start Vite dev server (port 5173)
	cd frontend && npm run dev

# ── Run everything ──

dev: ## Start DB + backend + frontend (all in background, logs to /tmp)
	@$(MAKE) db
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 2
	@cd backend && source .venv/bin/activate && \
		DATABASE_URL="postgresql+asyncpg://violeta:violeta@localhost:5432/violeta" \
		JWT_SECRET="dev-secret-change-in-production" \
		FRONTEND_URL="http://localhost:5173" \
		uvicorn app.main:app --reload --port 8000 > /tmp/violeta-backend.log 2>&1 & echo $$! > /tmp/violeta-backend.pid
	@cd frontend && npm run dev > /tmp/violeta-frontend.log 2>&1 & echo $$! > /tmp/violeta-frontend.pid
	@sleep 2
	@echo ""
	@echo "Violeta is running:"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API docs: http://localhost:8000/docs"
	@echo ""
	@echo "  Logs: tail -f /tmp/violeta-backend.log /tmp/violeta-frontend.log"
	@echo "  Stop: make dev-stop"

dev-stop: ## Stop all dev services
	@kill $$(cat /tmp/violeta-backend.pid 2>/dev/null) 2>/dev/null || true
	@kill $$(cat /tmp/violeta-frontend.pid 2>/dev/null) 2>/dev/null || true
	@rm -f /tmp/violeta-backend.pid /tmp/violeta-frontend.pid
	@$(MAKE) db-stop
	@echo "All services stopped."

# ── Docker Compose (full stack) ──

up: ## Start full stack with Docker Compose
	docker compose up --build -d
	@echo "Frontend: http://localhost:3000"

down: ## Stop Docker Compose stack
	docker compose down

# ── Tests ──

test: ## Run backend tests
	cd backend && source .venv/bin/activate && python -m pytest tests/ -v

# ── Cleanup ──

clean: ## Remove build artifacts and venvs
	rm -rf backend/.venv backend/__pycache__ backend/.pytest_cache
	rm -rf frontend/node_modules frontend/dist
	docker rm -f violeta-db 2>/dev/null || true
	docker volume rm violeta-pgdata 2>/dev/null || true
