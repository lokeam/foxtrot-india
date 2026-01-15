.PHONY: help install setup dev build start clean kill-ports
.PHONY: docker-build docker-up docker-down docker-logs
.PHONY: db-setup db-migrate db-seed db-reset db-studio db-nuke db-fresh nuclear
.PHONY: lint format typecheck

help:
	@echo "Heave Fleet Inspector - Available Commands"
	@echo ""
	@echo "Installation & Setup:"
	@echo "  make install       - Install all dependencies"
	@echo "  make setup         - Complete first-time setup (install + db setup + seed)"
	@echo ""
	@echo "Database Operations:"
	@echo "  make db-setup      - Create database and run migrations"
	@echo "  make db-apply      - Apply existing migrations (safe, no new migrations)"
	@echo "  make db-migrate    - Create and apply new migrations (dev only)"
	@echo "  make db-seed       - Seed demo data"
	@echo "  make db-reset      - Reset database (Prisma only, may fail)"
	@echo ""
	@echo "Nuclear Options (when things break):"
	@echo "  make db-fresh      - FRESH START - Destroy volume, rebuild DB"
	@echo "  make db-nuke       - Nuke database volume only"
	@echo "  make nuclear       - NUCLEAR OPTION - Destroy everything and rebuild"
	@echo ""
	@echo "  make db-studio     - Open Prisma Studio"
	@echo ""
	@echo "Development:"
	@echo "  make dev           - Start development server"
	@echo "  make build         - Build TypeScript to JavaScript"
	@echo "  make start         - Start production server"
	@echo ""
	@echo "Docker Operations:"
	@echo "  make docker-build  - Build Docker images"
	@echo "  make docker-up     - Start Docker containers"
	@echo "  make docker-down   - Stop Docker containers"
	@echo "  make docker-logs   - View container logs"
	@echo ""
	@echo "Quality:"
	@echo "  make lint          - Run ESLint"
	@echo "  make format        - Run Prettier"
	@echo "  make typecheck     - Run TypeScript compiler check"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean         - Remove build artifacts and node_modules"

install:
	@echo "📦 Installing dependencies..."
	@npm install
	@cd packages/api && npm install
	@echo "✅ Dependencies installed"

setup: install docker-up db-setup db-seed
	@echo "🎉 Setup complete! Run 'make dev' to start development server"

kill-ports:
	@echo "🔪 Killing zombie processes on ports 3002 and 8082..."
	@lsof -ti:3002 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@pkill -f "tsx watch" 2>/dev/null || true
	@pkill -f "expo start" 2>/dev/null || true
	@echo "✅ Ports cleared"

dev: kill-ports
	@echo "🚀 Starting development server..."
	@cd packages/api && npm run dev

build:
	@echo "🔨 Building TypeScript..."
	@cd packages/api && npm run build
	@echo "✅ Build complete"

start:
	@echo "🚀 Starting production server..."
	@cd packages/api && npm start

docker-build:
	@echo "🐳 Building Docker images..."
	@docker compose build
	@echo "✅ Docker images built"

docker-up:
	@echo "🐳 Starting Docker containers..."
	@docker compose up -d
	@echo "⏳ Waiting for database to be ready..."
	@sleep 5
	@echo "✅ Docker containers started"

docker-down:
	@echo "🐳 Stopping Docker containers..."
	@docker compose down
	@echo "✅ Docker containers stopped"

docker-logs:
	@docker compose logs -f

db-setup: docker-up
	@echo "🗄️  Setting up database..."
	@cd packages/api && npx prisma generate
	@cd packages/api && npx prisma migrate dev --name init
	@echo "✅ Database setup complete"

db-apply:
	@echo "🗄️  Applying existing migrations..."
	@cd packages/api && npx prisma migrate deploy
	@echo "✅ Migrations applied"

db-migrate:
	@echo "🗄️  Creating and running new migrations..."
	@cd packages/api && npx prisma migrate dev
	@echo "✅ Migrations complete"

db-seed:
	@echo "🌱 Seeding database..."
	@cd packages/api && npm run db:seed
	@echo "✅ Database seeded"

db-reset:
	@echo "🗄️  Resetting database..."
	@cd packages/api && npx prisma migrate reset --force
	@echo "✅ Database reset complete"

db-studio:
	@echo "🎨 Opening Prisma Studio..."
	@cd packages/api && npm run db:studio

nuclear:
	@echo "💣 NUCLEAR OPTION - Destroying all Docker containers and volumes..."
	@lsof -ti:3002 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8082 | xargs kill -9 2>/dev/null || true
	@pkill -f "tsx watch" 2>/dev/null || true
	@pkill -f "expo start" 2>/dev/null || true
	@docker compose down -v
	@echo "🐳 Starting fresh Docker containers..."
	@docker compose up -d
	@echo "⏳ Waiting for database to be ready..."
	@sleep 8
	@echo "🗄️  Applying migrations..."
	@cd packages/api && npx prisma migrate deploy
	@echo "🌱 Seeding database..."
	@cd packages/api && npx tsx prisma/seed.ts
	@echo "📦 Creating Supabase storage bucket..."
	@curl -X POST "http://localhost:8000/bucket" \
		-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU" \
		-H "Content-Type: application/json" \
		-d '{"id":"inspection-photos","name":"inspection-photos","public":true}' \
		2>/dev/null || true
	@echo "✅ Complete rebuild successful!"

db-nuke:
	@echo "💣 Destroying database volume..."
	@docker compose stop db
	@docker volume rm foxtrot-india_postgres_data || true
	@docker compose up -d db
	@echo "⏳ Waiting for database to be ready..."
	@sleep 8
	@echo "🗄️  Applying migrations..."
	@cd packages/api && npx prisma migrate deploy
	@echo "🌱 Seeding database..."
	@cd packages/api && npx tsx prisma/seed.ts
	@echo "✅ Database rebuilt!"

db-fresh:
	@echo "🔄 Fresh database reset..."
	@docker compose down
	@docker volume rm foxtrot-india_postgres_data || true
	@docker compose up -d
	@echo "⏳ Waiting for database to be ready..."
	@sleep 8
	@cd packages/api && npx prisma migrate deploy
	@cd packages/api && npx tsx prisma/seed.ts
	@echo "✅ Fresh database ready!"

lint:
	@echo "🔍 Running ESLint..."
	@cd packages/api && npm run lint

format:
	@echo "✨ Running Prettier..."
	@npx prettier --write "packages/**/*.{ts,tsx,js,jsx,json,md}"

typecheck:
	@echo "🔍 Running TypeScript compiler check..."
	@cd packages/api && npm run typecheck

clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf node_modules packages/*/node_modules packages/*/dist
	@echo "✅ Clean complete"
