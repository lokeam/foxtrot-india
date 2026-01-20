# Database Architecture

## Schema Overview

Foxtrot India's database uses PostgreSQL with Prisma ORM for type-safe queries and migrations. The schema models heavy equipment fleet management with a focus on service documentation.

## Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐         ┌──────────────────┐
│  Equipment  │────────<│    Jobs     │────────<│ ServiceRecords   │
└─────────────┘    1:N  └─────────────┘    1:1  └──────────────────┘
      │
      │ 1:N
      ▼
┌─────────────┐
│ Inspections │
└─────────────┘
```

## Core Tables

### Equipment

Represents physical heavy machinery in the fleet.

```prisma
model Equipment {
  id                String       @id @default(cuid())
  serialNumber      String       @unique
  make              String
  model             String
  status            EquipmentStatus @default(OPERATIONAL)
  engineHours       Int
  projectSite       String
  latitude          Float?
  longitude         Float?
  lastInspectionAt  DateTime?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  inspections       Inspection[]
  jobs              Job[]
}
```

**Key Design Decisions:**
- `cuid()` for IDs (collision-resistant, URL-safe)
- `engineHours` as integer (no fractional hours in field)
- Optional GPS coordinates (not all sites have accurate location)
- Denormalized `lastInspectionAt` for quick filtering

### Job

Represents a service request assigned to a technician.

```prisma
model Job {
  id                String       @id @default(cuid())
  equipmentId       String
  customerId        String
  customerName      String
  siteAddress       String
  contactName       String
  contactPhone      String
  contactEmail      String?
  issueDescription  String
  status            JobStatus    @default(ASSIGNED)
  technicianId      String
  technicianName    String
  assignedAt        DateTime     @default(now())
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  equipment         Equipment    @relation(fields: [equipmentId], references: [id])
  serviceRecord     ServiceRecord?

  @@index([technicianId, status])
  @@index([equipmentId])
}
```

**Key Design Decisions:**
- Denormalized `customerName` and `technicianName` (avoids joins for list views)
- Composite index on `(technicianId, status)` for "my active jobs" query
- Optional `contactEmail` (not all customers provide email)
- `assignedAt` separate from `createdAt` (jobs can be created before assignment)

### ServiceRecord

Documents the before/after state of service work.

```prisma
model ServiceRecord {
  id                  String    @id @default(cuid())
  jobId               String    @unique

  // Check-In (Before State)
  beforePhotos        String[]
  beforeNotes         String?
  beforeEngineHours   Int
  arrivedAt           DateTime
  isCheckInComplete   Boolean   @default(true)

  // Completion (After State)
  afterPhotos         String[]  @default([])
  diagnosis           String?
  workPerformed       String?
  partsUsed           String?
  afterEngineHours    Int?
  completedAt         DateTime?
  isJobComplete       Boolean   @default(false)

  // Revision Tracking
  revisedAt           DateTime?
  revisionCount       Int       @default(0)

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  job                 Job       @relation(fields: [jobId], references: [id])

  @@index([jobId])
}
```

**Key Design Decisions:**
- 1:1 relationship with Job (enforced by `@unique` on `jobId`)
- Photo URLs stored as string array (Supabase Storage public URLs)
- Nullable after-state fields (populated on completion)
- `isCheckInComplete` and `isJobComplete` flags for workflow state
- Revision tracking fields added for edit audit trail

### Inspection (Legacy)

Original inspection model, kept for backward compatibility.

```prisma
model Inspection {
  id            String    @id @default(cuid())
  equipmentId   String
  technicianId  String
  technicianName String
  notes         String
  photos        String[]
  latitude      Float?
  longitude     Float?
  inspectedAt   DateTime  @default(now())
  createdAt     DateTime  @default(now())

  equipment     Equipment @relation(fields: [equipmentId], references: [id])

  @@index([equipmentId])
  @@index([inspectedAt])
}
```

**Status:** Used for general inspections, separate from job-based service records.

## Enums

### JobStatus

```prisma
enum JobStatus {
  PENDING      // Created but not assigned
  ASSIGNED     // Assigned to technician
  IN_PROGRESS  // Technician checked in
  COMPLETED    // Work finished
  CANCELLED    // Job cancelled
}
```

### EquipmentStatus

```prisma
enum EquipmentStatus {
  OPERATIONAL
  DOWN
  MAINTENANCE
  RETIRED
}
```

## Indexes

### Performance Optimizations

```prisma
// Job queries
@@index([technicianId, status])  // "My active jobs" query
@@index([equipmentId])            // Equipment job history

// Inspection queries
@@index([equipmentId])            // Equipment inspection history
@@index([inspectedAt])            // Recent inspections across fleet

// ServiceRecord queries
@@index([jobId])                  // Job → ServiceRecord lookup
```

**Query Patterns:**
- Technicians query jobs by `technicianId` + `status` (most common)
- Equipment detail pages query by `equipmentId`
- Dashboard queries recent inspections by `inspectedAt` DESC

## Migration Strategy

### Prisma Migrate

All schema changes use Prisma's migration system:

```bash
# Development: Create and apply migration
npx prisma migrate dev --name add_revision_tracking

# Production: Apply existing migrations
npx prisma migrate deploy
```

### Migration History

1. `20260119144955_add_job_and_service_record_models` - Initial job workflow
2. `20260119145123_add_revision_tracking_fields` - Revision tracking

### Rollback Strategy

Prisma doesn't support automatic rollbacks. For production:
1. Create inverse migration (e.g., drop columns)
2. Test in staging environment
3. Apply during maintenance window
4. Restore from backup if catastrophic failure

## Data Integrity

### Foreign Key Constraints

All relationships enforce referential integrity:
- `Job.equipmentId` → `Equipment.id` (CASCADE on delete)
- `ServiceRecord.jobId` → `Job.id` (CASCADE on delete)
- `Inspection.equipmentId` → `Equipment.id` (CASCADE on delete)

### Unique Constraints

- `Equipment.serialNumber` - No duplicate equipment
- `ServiceRecord.jobId` - One service record per job

### Check Constraints

Not enforced at database level (Prisma limitation). Validated in application:
- `afterEngineHours >= beforeEngineHours`
- `completedAt >= arrivedAt`
- Photo arrays max 4 items

## Transactions

### Atomic State Changes

All workflow state transitions use Prisma transactions:

```typescript
// Check-In
await prisma.$transaction([
  prisma.serviceRecord.create({
    data: { jobId, beforePhotos, beforeNotes, beforeEngineHours, arrivedAt }
  }),
  prisma.job.update({
    where: { id: jobId },
    data: { status: 'IN_PROGRESS' }
  })
]);

// Complete Job
await prisma.$transaction([
  prisma.serviceRecord.update({
    where: { id: serviceRecordId },
    data: { afterPhotos, diagnosis, workPerformed, completedAt, isJobComplete: true }
  }),
  prisma.job.update({
    where: { id: jobId },
    data: { status: 'COMPLETED' }
  })
]);
```

**Why Transactions:**
- Prevents orphaned service records
- Ensures job status matches service record state
- Maintains consistency during failures

## Seed Data

### Demo Data Structure

```typescript
// 5 Equipment records (various makes/models)
// 15 Inspection records (historical data)
// 10 Job records:
//   - 2 ASSIGNED to tech_001
//   - 1 IN_PROGRESS for tech_001
//   - 5 COMPLETED with service records
//   - 2 ASSIGNED to other technicians
```

**Seed Script:** `packages/api/prisma/seed.ts`

**Reset Command:**
```bash
make db-reset  # Drops all data, re-runs migrations, re-seeds
```

## Storage Schema

### Supabase Storage

Photos stored in `inspection-photos` bucket:

```
inspection-photos/
├── checkin_{jobId}_{timestamp}_0.jpg
├── checkin_{jobId}_{timestamp}_1.jpg
├── complete_{jobId}_{timestamp}_0.jpg
└── complete_{jobId}_{timestamp}_1.jpg
```

**Naming Convention:**
- Prefix: `checkin_` or `complete_`
- Job ID: Links photo to job
- Timestamp: Prevents collisions
- Index: Photo order (0-3)

**Database Storage:**
- URLs stored as string arrays in `beforePhotos` / `afterPhotos`
- No file metadata stored (size, type, etc.)
- Deletion handled by API (not cascading)

## Scaling Considerations

### Current Limitations

- No partitioning (single table for all jobs)
- No archival strategy (completed jobs stay in main table)
- No read replicas (single PostgreSQL instance)

### Future Optimizations

**Partitioning:**
```sql
-- Partition jobs by year
CREATE TABLE jobs_2026 PARTITION OF jobs
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

**Archival:**
- Move jobs older than 1 year to `jobs_archive` table
- Keeps main table small for fast queries
- Archive table uses cheaper storage tier

**Read Replicas:**
- Route list queries to read replica
- Route mutations to primary
- Reduces load on primary database

## Backup Strategy

### Docker Volume Backup

```bash
# Backup PostgreSQL volume
docker run --rm \
  -v foxtrot-india_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_$(date +%Y%m%d).tar.gz /data

# Restore
docker run --rm \
  -v foxtrot-india_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres_20260120.tar.gz -C /
```

### Production Backup

- Automated daily snapshots (Supabase managed)
- Point-in-time recovery (7 day retention)
- Cross-region replication for disaster recovery
