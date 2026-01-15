.PHONY: help install setup dev build start clean
.PHONY: docker-build docker-up docker-down docker-logs
.PHONY: db-setup db-migrate db-seed db-reset db-studio
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
	@echo "  make db-migrate    - Run pending migrations"
	@echo "  make db-seed       - Seed demo data"
	@echo "  make db-reset      - Reset database (drop, migrate, seed)"
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

dev:
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

db-migrate:
	@echo "🗄️  Running migrations..."
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
