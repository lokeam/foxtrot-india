# Heave Fleet Inspector

Production-quality mobile + web application for heavy equipment fleet management and inspections.

## Tech Stack

- **Mobile:** React Native (Expo), TypeScript, React Navigation, React Query, tRPC Client
- **Web:** React, Vite, TypeScript, Tailwind CSS, React Query, tRPC Client
- **Backend:** Node.js, Express, tRPC, Prisma ORM, TypeScript
- **Database:** PostgreSQL (Supabase Local)
- **Storage:** Supabase Storage (Local)
- **DevOps:** Docker, Docker Compose, Makefile

## Prerequisites

- Node.js 20.x LTS
- npm 10.x
- Docker Desktop
- iOS Simulator (for mobile development)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start Docker containers (Supabase + API)
make docker-up

# Run database migrations and seed data
make setup

# Start development server
make dev
```

## Project Structure

```
foxtrot-india/
├── packages/
│   ├── api/          # Backend API (Node + Express + tRPC)
│   ├── mobile/       # React Native mobile app
│   └── web/          # React web dashboard
├── docker-compose.yml
├── Makefile
└── README.md
```

## Development Commands

See `Makefile` for all available commands:

```bash
make help           # Show all available commands
make setup          # Complete first-time setup
make dev            # Start development server
make docker-up      # Start Docker containers
make docker-down    # Stop Docker containers
make db-migrate     # Run database migrations
make db-seed        # Seed demo data
make db-reset       # Reset database (fresh start)
```

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT TIER                          │
├───────────────────────────┬──────────────────────────────┤
│  Mobile (React Native)    │  Web (React + Vite)          │
│  - Expo managed workflow  │  - Tailwind CSS              │
│  - React Navigation       │  - React Query               │
│  - React Query + tRPC     │  - tRPC Client               │
│  - AsyncStorage caching   │  - Polling (3s interval)     │
└─────────────┬─────────────┴─────────────┬────────────────┘
              │      HTTP/JSON (tRPC)     │
              └─────────────┬─────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│              API TIER (Node + Express)                   │
│  - tRPC router (type-safe endpoints)                     │
│  - Zod validation (input schemas)                        │
│  - Prisma ORM (database access)                          │
│  - Supabase client (photo storage)                       │
│  - Docker containerized                                  │
└──────────────┬───────────────────────┬───────────────────┘
               │                       │
     ┌─────────▼─────────┐   ┌────────▼──────────┐
     │  PostgreSQL       │   │  Supabase Storage │
     │  (Supabase)       │   │  (Local Files)    │
     │  - equipment      │   │  - inspection-    │
     │  - inspections    │   │    photos/        │
     └───────────────────┘   └───────────────────┘
```

## API Endpoints

- `equipment.list` - Get all equipment
- `equipment.byId` - Get equipment by ID with inspection history
- `inspection.create` - Create new inspection with photos
- `inspection.recent` - Get recent inspections across fleet

## License

MIT
