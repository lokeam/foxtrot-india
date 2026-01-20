# Foxtrot India

**Foxtrot India** (Field Inspector) is a full-stack demonstration _technician service documentation system_ for [heavy equipment](https://en.wikipedia.org/wiki/Heavy_equipment) fleet management showcasing a two-step workflow for field service documentation. 🚜 📱 The app separates check-in (before) state from completion (after) state, preventing data loss during multi-hour jobs and creating a clear audit trail of service work with photo evidence, revision tracking, and complete type safety across mobile and backend.

## Screenshots

<img width="334" alt="Foxtrot India splash screen" src="https://github.com/user-attachments/assets/2a83d4a6-e792-464e-9692-707ed585a1d9" />
<img width="334" alt="Foxtrot India Active Jobs screen"  src="https://github.com/user-attachments/assets/9a478b22-bee7-4ae2-b949-77616e3539db" />
<img width="334" alt="Foxtrot India Active Job Details screen top" src="https://github.com/user-attachments/assets/463d3cb0-2daf-4045-a140-48add8c5e4c6" />
<img width="334" alt="Foxtrot India Active Job Details screen bottom" src="https://github.com/user-attachments/assets/ca9b6c56-4f8c-4386-8b8d-904accbdbab2" />
<img width="334" alt="Foxtrot India Add Photo screen" src="https://github.com/user-attachments/assets/72ada17c-505f-4918-894c-c2af93b7af30" />


**Key Features:**
- 2️⃣ **Two-Step Workflow** - Check-in → Complete job with before/after documentation
- 🔄 **Revision Tracking** - Edit completed jobs with full audit trail
- 💾 **Draft Persistence** - AsyncStorage auto-save prevents data loss
- 🇹 **Type Safety** - tRPC + Prisma + Zod end-to-end type checking
- 📱 **Mobile First** - React Native with camera, location, offline support
- 🏷️ **Status Badges** - Visual indicators for job state and revisions

## Tech Stack

- **Mobile:** React Native (Expo 54), TypeScript, React Navigation, React Query, tRPC
- **Backend:** Node.js 20, Express, tRPC v10, Prisma, Zod
- **Database:** PostgreSQL 15+ (Supabase local)
- **Storage:** Supabase Storage (S3-compatible)
- **DevOps:** Docker Compose, Makefile

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop
- Make (pre-installed on Mac/Linux)
- iOS Simulator or Android Emulator (for mobile)

### Development Setup

```bash
# Install dependencies
npm install

# Start everything (Docker + API)
make setup
```

Visit [http://localhost:3002](http://localhost:3002) to ensure that the API is running.

For mobile development:
```bash
cd packages/mobile
npm run ios     # iOS simulator
npm run android # Android emulator
```

## Available Commands

Run `make help` to see all available commands:

### Core Commands

- **`make setup`** - Complete first-time setup (install + Docker + DB + seed)
- **`make dev`** - Start API development server
- **`make docker-up`** - Start Docker containers (PostgreSQL + Supabase Storage)
- **`make docker-down`** - Stop Docker containers
- **`make clean`** - Remove build artifacts and node_modules

### Database Commands

- **`make db-fresh`** - Quick database refresh (destroy volume + rebuild)
- **`make db-seed`** - Seed database with demo data
- **`make db-migrate`** - Create and apply new migrations
- **`make db-apply`** - Apply existing migrations (safe, no new migrations)
- **`make db-studio`** - Open Prisma Studio (database GUI)

### Nuclear Options

- **`make nuclear`** - Destroy everything and rebuild 💥
- **`make db-nuke`** - Nuke database volume only ⚠️

## Common Workflows

### First Time Setup

```bash
make setup        # Installs deps, starts Docker, creates DB, seeds data
make dev          # Start API server
# In another terminal:
cd packages/mobile && npm run ios
```

### After Schema Changes

```bash
make db-fresh     # Destroy volume, rebuild DB, reseed
```

### Database Issues?

```bash
make nuclear      # Nuclear option (destroys all data)
```

### Daily Development

```bash
make dev          # Just start the API server
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Mobile App (React Native + Expo)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ ActiveJobs   │  │ CheckIn      │  │ CompleteJob  │       │
│  │ Screen       │  │ Screen       │  │ Screen       │       │
│  └──────┬───────┘  └──────────────┘  └──────────────┘       │
│         │ tRPC Queries/Mutations                            │
│         ▼                                                   │
├─────────────────────────────────────────────────────────────┤
│              Backend (Node + Express + tRPC)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routers: job | serviceRecord | equipment             │   │
│  │  • job.listActive()  • serviceRecord.checkIn()       │   │
│  │  • job.byId()        • serviceRecord.complete()      │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           ▼                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Prisma ORM + Zod Validation                          │   │
│  │  Atomic Transactions | Type-Safe Queries             │   │
│  └────────┬─────────────────────────────────────────────┘   │
│           ▼                                                 │
├─────────────────────────────────────────────────────────────┤
│              Data Layer (PostgreSQL + Storage)              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  PostgreSQL      │         │ Supabase Storage │          │
│  │  - Equipment     │         │ - Before Photos  │          │
│  │  - Jobs          │         │ - After Photos   │          │
│  │  - ServiceRecords│         │ (inspection-     │          │
│  │  - Inspections   │         │  photos bucket)  │          │
│  └──────────────────┘         └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Workflow State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Job Created
    PENDING --> ASSIGNED: Assign to Technician
    ASSIGNED --> IN_PROGRESS: serviceRecord.checkIn()

    note right of IN_PROGRESS
        Before State Captured:
        • Before photos (0-4)
        • Initial notes
        • Engine hours
        • Arrival timestamp
    end note

    IN_PROGRESS --> COMPLETED: serviceRecord.complete()

    note right of COMPLETED
        After State Captured:
        • Diagnosis
        • Work performed
        • Parts used
        • After photos (0-4)
        • Final engine hours
    end note

    COMPLETED --> COMPLETED: serviceRecord.updateCheckIn()\n(Edit before-state)
    COMPLETED --> COMPLETED: serviceRecord.updateCompletion()\n(Edit after-state, increment revision)

    ASSIGNED --> CANCELLED: Cancel Job
    IN_PROGRESS --> CANCELLED: Cancel Job
    PENDING --> CANCELLED: Cancel Job

    COMPLETED --> [*]
    CANCELLED --> [*]
```

## Project Structure

```
foxtrot-india/
├── packages/
│   ├── api/                    # Backend (Node + tRPC + Prisma)
│   │   ├── src/
│   │   │   ├── routers/       # tRPC route handlers
│   │   │   │   ├── job.ts
│   │   │   │   ├── serviceRecord.ts
│   │   │   │   └── equipment.ts
│   │   │   └── index.ts       # Express + tRPC server
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   └── seed.ts        # Demo data seeder
│   │   └── uploads/           # Temp photo storage
│   └── mobile/                 # React Native app
│       ├── src/
│       │   ├── screens/       # App screens
│       │   │   ├── ActiveJobsScreen.tsx
│       │   │   ├── JobDetailScreen.tsx
│       │   │   ├── CheckInScreen.tsx
│       │   │   └── CompleteJobScreen.tsx
│       │   ├── components/    # Reusable components
│       │   │   ├── FoxydroidDoubleNoseRN.tsx
│       │   │   └── CustomSplashScreen.tsx
│       │   └── navigation/    # React Navigation setup
│       └── app.json           # Expo configuration
├── docs/                       # Technical documentation
│   ├── WORKFLOW.md            # Two-step workflow documentation
│   ├── system_architecture.md # Architecture deep dive
│   ├── database_architecture.md # Database schema docs
│   └── api_reference.md       # tRPC API documentation
├── docker-compose.yml         # PostgreSQL + Supabase Storage
├── Makefile                   # Development commands
└── README.md                  # This file
```

## Two-Step Workflow

### Step 1: Check-In (Arrival)
Technician arrives at job site and captures **before** state:
- Before photos (0-4)
- Initial notes
- Engine hours reading
- Arrival timestamp

Creates `ServiceRecord`, updates job status to `IN_PROGRESS`.

### Step 2: Complete Job (After Repair)
Technician finishes repair and captures **after** state:
- Diagnosis
- Work performed
- Parts used
- After photos (0-4)
- Final engine hours

Updates `ServiceRecord`, updates job status to `COMPLETED`.

### Revision Tracking
Completed jobs can be edited with full audit trail:
- **Edit Check-In:** Update before-state (no revision count)
- **Edit Completion:** Update after-state (increments revision count)
- Orange "Revised (N)" badge on job cards
- `revisedAt` timestamp tracked

## Environment Variables

Create `.env` file in `/packages/api`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
SUPABASE_URL=http://localhost:8000
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://localhost:8082
PORT=3002
```

## API Endpoints

### Job Router
- `job.listActive({ technicianId })` - Get active jobs (ASSIGNED, IN_PROGRESS)
- `job.listCompleted({ technicianId })` - Get completed jobs
- `job.byId({ jobId })` - Get job with equipment and service record

### ServiceRecord Router
- `serviceRecord.checkIn({ jobId, beforePhotos, beforeNotes, beforeEngineHours, arrivedAt })` - Create service record
- `serviceRecord.complete({ serviceRecordId, afterPhotos, diagnosis, workPerformed, partsUsed, afterEngineHours, completedAt })` - Complete job
- `serviceRecord.updateCheckIn({ serviceRecordId, ... })` - Edit before-state
- `serviceRecord.updateCompletion({ serviceRecordId, ... })` - Edit after-state (increments revision)
- `serviceRecord.deleteBeforePhoto({ serviceRecordId, photoUrl })` - Remove before photo
- `serviceRecord.deleteAfterPhoto({ serviceRecordId, photoUrl })` - Remove after photo

### Equipment Router
- `equipment.list()` - Get all equipment
- `equipment.byId({ id })` - Get equipment with inspection history

### Photo Upload
- `POST /upload` - Upload photo to Supabase Storage (REST endpoint)

## Troubleshooting

### Database not working?

```bash
make db-fresh     # Destroy volume and rebuild
```

### Docker containers unhealthy?

```bash
make nuclear      # Nuclear option
```

### Port 3002 already in use?

```bash
make dev          # Automatically kills zombie processes
```

### Mobile app can't connect to API?

**iOS:** Use `http://localhost:3002`
**Android:** Use `http://10.0.2.2:3002` (Android emulator networking)

Check `packages/mobile/src/config/constants.ts` for platform-specific URLs.

## Documentation

- **[user_journey.md](docs/user_journey.md)** - Field technician workflow and user journey
- **[system_architecture.md](docs/system_architecture.md)** - Architecture decisions and scaling
- **[database_architecture.md](docs/database_architecture.md)** - Database schema and migrations
- **[api_reference.md](docs/api_reference.md)** - Complete tRPC API documentation

## License

MIT
