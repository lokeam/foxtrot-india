# API Reference

## Overview

Foxtrot India's API uses tRPC for type-safe remote procedure calls. All endpoints are defined in TypeScript, with automatic type inference on both client and server. Input validation uses Zod schemas.

**Base URL:** `http://localhost:3002/trpc`

## Type Safety

tRPC eliminates the need for API documentation to stay in sync with implementation. The TypeScript compiler enforces contracts:

```typescript
// Server defines procedure
export const jobRouter = t.router({
  byId: t.procedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => { ... })
});

// Client gets full type inference
const job = await trpc.job.byId.useQuery({ jobId: 'abc123' });
//    ^? Job | undefined
```

If the server changes the return type, client code breaks at compile time, not runtime.

## Routers

### Job Router

#### `job.listActive`

Get active jobs (ASSIGNED or IN_PROGRESS) for a technician.

**Input:**
```typescript
{
  technicianId: string  // Technician's ID
}
```

**Output:**
```typescript
{
  id: string
  equipmentId: string
  customerName: string
  siteAddress: string
  issueDescription: string
  status: 'ASSIGNED' | 'IN_PROGRESS'
  assignedAt: Date
  equipment: {
    serialNumber: string
    make: string
    model: string
    engineHours: number
  }
  serviceRecord?: {
    beforePhotos: string[]
    beforeNotes: string | null
    beforeEngineHours: number
    arrivedAt: Date
    revisedAt: Date | null
    revisionCount: number
  }
}[]
```

**Query:**
```sql
SELECT * FROM jobs
WHERE technician_id = $1
  AND status IN ('ASSIGNED', 'IN_PROGRESS')
ORDER BY assigned_at DESC
```

**Use Case:** Mobile app home screen showing technician's current workload.

---

#### `job.listCompleted`

Get completed jobs for a technician.

**Input:**
```typescript
{
  technicianId: string
}
```

**Output:** Same structure as `listActive`, but `status` is always `'COMPLETED'`.

**Query:**
```sql
SELECT * FROM jobs
WHERE technician_id = $1
  AND status = 'COMPLETED'
ORDER BY updated_at DESC
```

**Use Case:** Job history view, showing past work with revision badges.

---

#### `job.byId`

Get detailed job information including full service record.

**Input:**
```typescript
{
  jobId: string
}
```

**Output:**
```typescript
{
  id: string
  equipmentId: string
  customerId: string
  customerName: string
  siteAddress: string
  contactName: string
  contactPhone: string
  contactEmail: string | null
  issueDescription: string
  status: JobStatus
  technicianId: string
  technicianName: string
  assignedAt: Date
  equipment: {
    serialNumber: string
    make: string
    model: string
    status: EquipmentStatus
    engineHours: number
    projectSite: string
  }
  serviceRecord?: {
    id: string
    beforePhotos: string[]
    beforeNotes: string | null
    beforeEngineHours: number
    arrivedAt: Date
    afterPhotos: string[]
    diagnosis: string | null
    workPerformed: string | null
    partsUsed: string | null
    afterEngineHours: number | null
    completedAt: Date | null
    isJobComplete: boolean
    revisedAt: Date | null
    revisionCount: number
  }
}
```

**Use Case:** Job detail screen showing all information and edit options.

---

### ServiceRecord Router

#### `serviceRecord.checkIn`

Create service record with before-state data and update job to IN_PROGRESS.

**Input:**
```typescript
{
  jobId: string
  beforePhotos: string[]      // Supabase Storage URLs
  beforeNotes: string | null
  beforeEngineHours: number
  arrivedAt: Date
}
```

**Output:**
```typescript
{
  id: string
  jobId: string
  beforePhotos: string[]
  beforeNotes: string | null
  beforeEngineHours: number
  arrivedAt: Date
  isCheckInComplete: boolean
}
```

**Validation:**
- Job must exist and be ASSIGNED
- beforeEngineHours must be positive integer
- beforePhotos array max 4 items
- arrivedAt must be valid date

**Transaction:**
```typescript
await prisma.$transaction([
  prisma.serviceRecord.create({ data: {...} }),
  prisma.job.update({
    where: { id: jobId },
    data: { status: 'IN_PROGRESS' }
  })
]);
```

**Error Codes:**
- `NOT_FOUND`: Job doesn't exist
- `BAD_REQUEST`: Job already has service record
- `BAD_REQUEST`: Invalid input data

---

#### `serviceRecord.complete`

Update service record with after-state data and mark job COMPLETED.

**Input:**
```typescript
{
  serviceRecordId: string
  afterPhotos: string[]
  diagnosis: string
  workPerformed: string
  partsUsed: string | null
  afterEngineHours: number
  completedAt: Date
}
```

**Output:**
```typescript
{
  id: string
  jobId: string
  afterPhotos: string[]
  diagnosis: string
  workPerformed: string
  partsUsed: string | null
  afterEngineHours: number
  completedAt: Date
  isJobComplete: boolean
}
```

**Validation:**
- ServiceRecord must exist
- Job must be IN_PROGRESS
- afterEngineHours >= beforeEngineHours
- diagnosis and workPerformed required
- afterPhotos array max 4 items

**Transaction:**
```typescript
await prisma.$transaction([
  prisma.serviceRecord.update({
    data: { ...afterData, isJobComplete: true }
  }),
  prisma.job.update({
    where: { id: jobId },
    data: { status: 'COMPLETED' }
  })
]);
```

**Error Codes:**
- `NOT_FOUND`: ServiceRecord doesn't exist
- `BAD_REQUEST`: Job not in IN_PROGRESS state
- `BAD_REQUEST`: afterEngineHours < beforeEngineHours

---

#### `serviceRecord.updateCheckIn`

Edit before-state data for completed jobs.

**Input:**
```typescript
{
  serviceRecordId: string
  beforePhotos: string[]
  beforeNotes: string | null
  beforeEngineHours: number
}
```

**Output:** Updated ServiceRecord

**Validation:**
- ServiceRecord must exist
- Job must be COMPLETED
- Does NOT increment revisionCount (before-state edits don't affect diagnosis)

**Use Case:** Correcting initial documentation errors after job completion.

---

#### `serviceRecord.updateCompletion`

Edit after-state data for completed jobs. Increments revision count.

**Input:**
```typescript
{
  serviceRecordId: string
  afterPhotos: string[]
  diagnosis: string
  workPerformed: string
  partsUsed: string | null
  afterEngineHours: number
}
```

**Output:** Updated ServiceRecord with incremented revisionCount

**Validation:**
- ServiceRecord must exist
- Job must be COMPLETED
- afterEngineHours >= beforeEngineHours

**Revision Tracking:**
```typescript
await prisma.serviceRecord.update({
  where: { id: serviceRecordId },
  data: {
    ...afterData,
    revisedAt: new Date(),
    revisionCount: { increment: 1 }
  }
});
```

**Use Case:** Correcting diagnosis or work performed after initial completion.

---

#### `serviceRecord.deleteBeforePhoto`

Remove a photo from beforePhotos array.

**Input:**
```typescript
{
  serviceRecordId: string
  photoUrl: string
}
```

**Output:** Updated ServiceRecord

**Validation:**
- ServiceRecord must exist
- Job must NOT be COMPLETED (prevents editing completed jobs via photo deletion)
- photoUrl must exist in beforePhotos array

**Implementation:**
```typescript
const updatedPhotos = serviceRecord.beforePhotos.filter(
  url => url !== photoUrl
);
await prisma.serviceRecord.update({
  data: { beforePhotos: updatedPhotos }
});
```

---

#### `serviceRecord.deleteAfterPhoto`

Remove a photo from afterPhotos array.

**Input:**
```typescript
{
  serviceRecordId: string
  photoUrl: string
}
```

**Output:** Updated ServiceRecord

**Validation:** Same as deleteBeforePhoto

---

#### `serviceRecord.recent`

Get recent service records across all technicians.

**Input:** None

**Output:**
```typescript
{
  id: string
  jobId: string
  beforePhotos: string[]
  afterPhotos: string[]
  diagnosis: string | null
  workPerformed: string | null
  completedAt: Date | null
  job: {
    equipmentId: string
    customerName: string
    technicianName: string
  }
}[]
```

**Query:**
```sql
SELECT * FROM service_records
WHERE is_job_complete = true
ORDER BY completed_at DESC
LIMIT 10
```

**Use Case:** Dashboard feed showing recent completed work.

---

### Equipment Router

#### `equipment.list`

Get all equipment in fleet.

**Input:** None

**Output:**
```typescript
{
  id: string
  serialNumber: string
  make: string
  model: string
  status: EquipmentStatus
  engineHours: number
  projectSite: string
  lastInspectionAt: Date | null
}[]
```

**Use Case:** Equipment overview dashboard.

---

#### `equipment.byId`

Get equipment details with inspection history.

**Input:**
```typescript
{
  id: string
}
```

**Output:**
```typescript
{
  id: string
  serialNumber: string
  make: string
  model: string
  status: EquipmentStatus
  engineHours: number
  projectSite: string
  latitude: number | null
  longitude: number | null
  lastInspectionAt: Date | null
  inspections: {
    id: string
    technicianName: string
    notes: string
    photos: string[]
    inspectedAt: Date
  }[]
  jobs: {
    id: string
    status: JobStatus
    issueDescription: string
    technicianName: string
  }[]
}
```

**Use Case:** Equipment detail page with full service history.

---

### Inspection Router (Legacy)

#### `inspection.create`

Create standalone inspection (not tied to job).

**Input:**
```typescript
{
  equipmentId: string
  technicianId: string
  technicianName: string
  notes: string
  photos: string[]
  latitude: number | null
  longitude: number | null
}
```

**Output:** Created Inspection

**Use Case:** General equipment inspections outside of job workflow.

---

#### `inspection.recent`

Get recent inspections across fleet.

**Input:** None

**Output:**
```typescript
{
  id: string
  equipmentId: string
  technicianName: string
  notes: string
  photos: string[]
  inspectedAt: Date
  equipment: {
    serialNumber: string
    make: string
    model: string
  }
}[]
```

**Query:**
```sql
SELECT * FROM inspections
ORDER BY inspected_at DESC
LIMIT 20
```

---

## Photo Upload

### `POST /upload`

Upload photo to Supabase Storage. This is a REST endpoint, not tRPC.

**Request:**
```json
{
  "filename": "checkin_abc123_1234567890_0.jpg",
  "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "bucket": "inspection-photos"
}
```

**Response:**
```json
{
  "url": "http://localhost:8000/object/public/inspection-photos/checkin_abc123_1234567890_0.jpg"
}
```

**Implementation:**
```typescript
const buffer = Buffer.from(base64.split(',')[1], 'base64');
const uploadUrl = `${SUPABASE_URL}/object/${bucket}/${filename}`;
const response = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'image/jpeg'
  },
  body: buffer
});
```

**Error Handling:**
- Invalid base64: 400 Bad Request
- Storage failure: 500 Internal Server Error
- Bucket not found: 404 Not Found

---

## Error Handling

### tRPC Error Codes

```typescript
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Job not found'
});
```

**Standard Codes:**
- `BAD_REQUEST`: Invalid input (400)
- `NOT_FOUND`: Resource doesn't exist (404)
- `INTERNAL_SERVER_ERROR`: Unexpected error (500)

### Client Error Handling

```typescript
const mutation = trpc.serviceRecord.checkIn.useMutation({
  onError: (error) => {
    if (error.data?.code === 'NOT_FOUND') {
      Alert.alert('Error', 'Job not found');
    } else {
      Alert.alert('Error', 'Something went wrong');
    }
  }
});
```

---

## Rate Limiting

**Current:** None (local development)

**Production Recommendation:**
- 100 requests per minute per IP
- 1000 requests per hour per technician
- Exponential backoff on 429 responses

---

## Authentication

**Current:** None (demo purposes)

**Production Implementation:**
- JWT tokens from Supabase Auth
- Middleware validates token on each request
- Technician ID extracted from token claims
- Row-level security in database

```typescript
const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.req.headers.authorization?.split(' ')[1];
  const user = await verifyJWT(token);
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user } });
});
```

---

## Versioning

**Current:** No versioning (single client)

**Future Strategy:**
- Version in URL: `/trpc/v1/job.byId`
- Maintain v1 for 6 months after v2 release
- Deprecation warnings in response headers
- Client specifies accepted version in request
