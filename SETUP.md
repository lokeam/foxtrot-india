# Setup Instructions

## Prerequisites

Before running the setup, ensure you have:

1. **Docker Desktop** installed and running
   - Download from: https://www.docker.com/products/docker-desktop
   - Start Docker Desktop before running setup commands

2. **Node.js 20.x** installed
   - Check: `node --version`

3. **npm 10.x** installed
   - Check: `npm --version`

## Quick Setup

1. **Start Docker Desktop** (if not already running)

2. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Run complete setup:**
   ```bash
   make setup
   ```

This will:
- Install all dependencies
- Start Docker containers (PostgreSQL + Supabase Storage)
- Run database migrations
- Seed demo data

## Manual Setup (Step by Step)

If you prefer to run each step manually:

```bash
# 1. Install dependencies
make install

# 2. Copy environment file
cp .env.example .env

# 3. Start Docker containers
make docker-up

# 4. Setup database and run migrations
make db-setup

# 5. Seed demo data
make db-seed
```

## Verify Setup

After setup completes, verify everything is working:

```bash
# Start the development server
make dev
```

You should see:
```
✅ Database connected
✅ Server running on http://localhost:3001
📡 tRPC endpoint: http://localhost:3001/trpc
🏥 Health check: http://localhost:3001/health
```

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Docker not running
```
Error: Cannot connect to the Docker daemon
```
**Solution:** Start Docker Desktop and wait for it to fully initialize.

### Port already in use
```
Error: Port 3001 is already in use
```
**Solution:** Stop any other processes using port 3001, or change the PORT in `.env`

### Database connection failed
```
Error: Can't reach database server
```
**Solution:**
1. Ensure Docker containers are running: `docker ps`
2. Restart containers: `make docker-down && make docker-up`
3. Wait 10 seconds for database to initialize

## Next Steps

Once setup is complete:
- Run `make dev` to start development server
- Run `make db-studio` to open Prisma Studio (database GUI)
- See `make help` for all available commands
