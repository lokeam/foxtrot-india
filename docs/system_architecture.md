# System Architecture

## Design Philosophy

The Foxtrot India system prioritizes **developer experience** and **type safety** over architectural complexity. Every technology choice reduces the surface area for bugs and improves iteration speed.

## Technology Decisions

### Why tRPC Over REST?

**Problem with REST:**
- Client and server types drift over time
- API documentation becomes stale
- Runtime errors from type mismatches
- Manual serialization/deserialization

**tRPC Solution:**
```typescript
// Server defines procedure
export const jobRouter = t.router({
  byId: t.procedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.job.findUnique({...});
    })
});

// Client gets automatic type inference
const { data } = trpc.job.byId.useQuery({ jobId: 'abc' });
//     ^? Job | undefined - TypeScript knows the exact shape
```

**Benefits:**
- Compile-time type checking (errors caught before runtime)
- No API documentation needed (types are the documentation)
- Refactoring is safe (rename breaks at compile time)
- Zero serialization overhead (JSON over HTTP)

**Tradeoffs:**
- Requires TypeScript on both client and server
- Not suitable for public APIs (tightly coupled)
- Harder to version (breaking changes affect all clients)

**Verdict:** Perfect for internal tools where client and server are in the same repo.

---

### Why Prisma Over Raw SQL?

**Problem with Raw SQL:**
- No type safety (typos in column names)
- Manual migration management
- Verbose query building
- SQL injection risks

**Prisma Solution:**
```typescript
// Type-safe queries
const job = await prisma.job.findUnique({
  where: { id: jobId },
  include: { equipment: true, serviceRecord: true }
});
// TypeScript knows job.equipment.serialNumber exists

// Automatic migrations
// 1. Edit schema.prisma
// 2. Run: prisma migrate dev
// 3. Migration SQL generated and applied
```

**Benefits:**
- Full TypeScript integration (autocomplete, type checking)
- Declarative schema (single source of truth)
- Migration history tracked in Git
- Query builder prevents SQL injection

**Tradeoffs:**
- Learning curve for complex queries
- Generated SQL sometimes suboptimal
- Harder to optimize performance-critical queries

**Verdict:** Worth it for type safety and developer productivity. Can drop to raw SQL for specific optimizations.

---

### Why React Native (Expo) Over Native?

**Problem with Native Development:**
- Separate codebases for iOS and Android
- Slower iteration (compile times)
- Requires Swift/Kotlin expertise

**Expo Solution:**
- Single TypeScript codebase
- Hot reload (instant feedback)
- Managed workflow (no Xcode/Android Studio needed)
- Access to native APIs via expo-image-picker, expo-location

**Benefits:**
- Faster development (one codebase, instant reload)
- Easier hiring (JavaScript developers)
- Cross-platform by default

**Tradeoffs:**
- Larger app size (includes React Native runtime)
- Performance ceiling lower than native
- Some native modules require ejecting

**Verdict:** Perfect for internal tools where development speed matters more than app size.

---

### Why Monorepo Over Separate Repos?

**Structure:**
```
foxtrot-india/
├── packages/
│   ├── api/      # Backend (Node + tRPC + Prisma)
│   └── mobile/   # Mobile app (React Native + Expo)
└── package.json  # Root workspace
```

**Benefits:**
- Shared types between client and server (tRPC magic)
- Single `npm install` for all dependencies
- Atomic commits across frontend and backend
- Easier refactoring (change propagates immediately)

**Tradeoffs:**
- Larger Git repo
- Slower CI/CD (must build all packages)
- Dependency conflicts between packages

**Verdict:** Essential for tRPC to work. The shared types are worth the complexity.

---

## System Components

### Mobile App (React Native + Expo)

**Responsibilities:**
- Capture photos via device camera
- Display job lists and details
- Handle offline form state (AsyncStorage)
- Manage navigation between screens

**Key Libraries:**
- `@trpc/react-query` - Type-safe API calls
- `react-navigation` - Screen navigation
- `expo-image-picker` - Camera access
- `@react-native-async-storage/async-storage` - Local storage

**State Management:**
- React Query for server state (jobs, service records)
- React useState for local UI state (form inputs)
- AsyncStorage for draft persistence

**Why No Redux/MobX:**
React Query handles server state caching, invalidation, and refetching. Local state is simple enough for useState. Adding a state management library would be overengineering.

---

### API Server (Node + Express + tRPC)

**Responsibilities:**
- Validate requests (Zod schemas)
- Execute database queries (Prisma)
- Upload photos to storage (Supabase)
- Enforce business logic (workflow state transitions)

**Key Libraries:**
- `@trpc/server` - RPC framework
- `@prisma/client` - Database ORM
- `zod` - Schema validation
- `express` - HTTP server

**Architecture Pattern:**
```
Request → tRPC Router → Zod Validation → Business Logic → Prisma Query → Response
```

**Why Express + tRPC Instead of Next.js API Routes:**
- Simpler deployment (single Node process)
- No frontend bundling overhead
- Easier to containerize
- More control over middleware

---

### Database (PostgreSQL + Prisma)

**Responsibilities:**
- Store equipment, jobs, service records
- Enforce referential integrity (foreign keys)
- Provide transactional guarantees

**Why PostgreSQL Over MongoDB:**
- Relational data (jobs → equipment, jobs → service records)
- ACID transactions (critical for workflow state)
- Better tooling (Prisma, pgAdmin)
- Mature ecosystem

**Schema Design:**
- Normalized (3NF) with strategic denormalization
- Denormalized: `customerName`, `technicianName` (avoids joins in list views)
- Normalized: Equipment, Job, ServiceRecord relationships

---

### Storage (Supabase Storage)

**Responsibilities:**
- Store uploaded photos
- Serve photos via public URLs
- Handle file deletion

**Why Supabase Storage Over S3:**
- Local development (Docker container)
- S3-compatible API (easy migration)
- No AWS credentials needed
- Free tier generous

**Photo Upload Flow:**
```
Mobile → Base64 → API → Buffer → Supabase Storage → Public URL → Database
```

**Why Not Store Photos in Database:**
- Database bloat (photos are large)
- Slower queries (binary data in rows)
- Harder to serve (no CDN)

---

## Data Flow

### Check-In Flow

```
┌─────────┐  1. Capture Photos  ┌─────────┐
│ Mobile  │─────────────────────>│ Camera  │
└────┬────┘                      └─────────┘
     │
     │ 2. Convert to Base64
     │
     ▼
┌─────────┐  3. POST /upload    ┌─────────┐
│ Mobile  │─────────────────────>│   API   │
└─────────┘                      └────┬────┘
                                      │
                                      │ 4. Upload to Storage
                                      ▼
                                 ┌─────────┐
                                 │ Supabase│
                                 │ Storage │
                                 └────┬────┘
                                      │
                                      │ 5. Return URL
                                      ▼
┌─────────┐  6. checkIn mutation ┌─────────┐
│ Mobile  │─────────────────────>│   API   │
└─────────┘  {beforePhotos: [...]}└────┬────┘
                                      │
                                      │ 7. Transaction
                                      ▼
                                 ┌─────────┐
                                 │   DB    │
                                 │ - Create│
                                 │   SR    │
                                 │ - Update│
                                 │   Job   │
                                 └─────────┘
```

### Cache Invalidation Flow

```
┌─────────┐  1. Edit Completion  ┌─────────┐
│ Mobile  │─────────────────────>│   API   │
└────┬────┘                      └────┬────┘
     │                                │
     │                                │ 2. Update DB
     │                                ▼
     │                           ┌─────────┐
     │                           │   DB    │
     │                           └────┬────┘
     │                                │
     │ 3. Success Response            │
     │<───────────────────────────────┘
     │
     │ 4. Invalidate Queries
     ▼
┌─────────────────────┐
│ React Query Cache   │
│ - job.byId          │
│ - job.listActive    │
│ - job.listCompleted │
└──────────┬──────────┘
           │
           │ 5. Refetch
           ▼
      ┌─────────┐
      │   API   │
      └────┬────┘
           │
           │ 6. Fresh Data
           ▼
      ┌─────────┐
      │ Mobile  │
      │ (Badge  │
      │ Appears)│
      └─────────┘
```

---

## Scalability Considerations

### Current Architecture

**Single Server:**
- API, database, and storage on one machine (Docker Compose)
- No load balancing
- No horizontal scaling

**Suitable For:**
- 10-50 concurrent users
- 1000 jobs per day
- 10GB photo storage

### Scaling Path

**Phase 1: Vertical Scaling (0-500 users)**
- Increase server resources (CPU, RAM)
- Add database indexes
- Enable query caching

**Phase 2: Horizontal Scaling (500-5000 users)**
- Multiple API servers behind load balancer
- Read replicas for database
- CDN for photo serving
- Redis for session storage

**Phase 3: Microservices (5000+ users)**
- Separate photo upload service
- Separate job workflow service
- Message queue for async operations
- Event sourcing for audit trail

**Current Bottlenecks:**
1. Photo upload (synchronous, blocks request)
2. Database queries (no caching)
3. Single point of failure (one server)

**Quick Wins:**
1. Add Redis caching for list queries
2. Async photo upload (return immediately, process in background)
3. Database connection pooling

---

## Security Considerations

### Current State (Demo)

**No Authentication:**
- Technician ID passed in request
- No token validation
- No row-level security

**No Authorization:**
- Any technician can view any job
- No role-based access control

**No Encryption:**
- HTTP (not HTTPS)
- Database credentials in .env file

### Production Requirements

**Authentication:**
```typescript
// Supabase Auth JWT
const user = await supabase.auth.getUser(token);
if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
```

**Authorization:**
```typescript
// Row-level security
const jobs = await prisma.job.findMany({
  where: {
    technicianId: user.id,  // Only see own jobs
    status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
  }
});
```

**Encryption:**
- HTTPS for all API calls
- Encrypted database connections
- Secrets in environment variables (not Git)
- Photo URLs signed (expiring tokens)

**Input Validation:**
- Zod schemas on all inputs (already implemented)
- SQL injection prevention (Prisma handles this)
- XSS prevention (React escapes by default)

---

## Deployment Strategy

### Current (Local Development)

```bash
docker compose up -d  # Start database + storage
npm run dev           # Start API server
npm run dev:mobile    # Start Expo dev server
```

### Production (Recommended)

**API Server:**
- Deploy to Railway/Render/Fly.io
- Environment variables for secrets
- Health check endpoint: `/health`
- Graceful shutdown on SIGTERM

**Database:**
- Managed PostgreSQL (Supabase/Neon/Railway)
- Automated backups (daily)
- Connection pooling (PgBouncer)

**Storage:**
- Supabase Storage (managed)
- Or migrate to S3 (change 10 lines of code)

**Mobile App:**
- Build with `eas build`
- Distribute via TestFlight (iOS) or internal track (Android)
- Over-the-air updates with `expo-updates`

**CI/CD Pipeline:**
```yaml
# .github/workflows/deploy.yml
on: push to main
  - Run tests
  - Build API Docker image
  - Push to container registry
  - Deploy to Railway
  - Run database migrations
  - Notify Slack
```

---

## Testing Strategy

### Current State

**No Tests:** Prioritized feature development over test coverage for demo.

### Recommended Testing Pyramid

**Unit Tests (70%):**
- Zod schema validation
- Business logic functions
- Utility functions

**Integration Tests (20%):**
- tRPC endpoint tests
- Database transaction tests
- Photo upload flow

**E2E Tests (10%):**
- Mobile app flow (Detox)
- Critical user journeys

**Example Unit Test:**
```typescript
describe('serviceRecord.checkIn', () => {
  it('should create service record and update job status', async () => {
    const result = await caller.serviceRecord.checkIn({
      jobId: 'test-job',
      beforePhotos: ['url1.jpg'],
      beforeNotes: 'Test notes',
      beforeEngineHours: 1000,
      arrivedAt: new Date()
    });

    expect(result.jobId).toBe('test-job');

    const job = await prisma.job.findUnique({ where: { id: 'test-job' }});
    expect(job.status).toBe('IN_PROGRESS');
  });
});
```

---

## Monitoring & Observability

### Current State

**Logging:**
- Console.log statements
- Prisma query logging (development only)

**Metrics:**
- None

**Alerts:**
- None

### Production Requirements

**Logging:**
- Structured JSON logs (Winston/Pino)
- Log aggregation (Datadog/LogRocket)
- Error tracking (Sentry)

**Metrics:**
- Request latency (p50, p95, p99)
- Error rate
- Database query performance
- Photo upload success rate

**Alerts:**
- Error rate > 5%
- API latency > 2s
- Database connection pool exhausted
- Storage quota > 80%

**Example Instrumentation:**
```typescript
const logger = pino();

export const jobRouter = t.router({
  byId: t.procedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const start = Date.now();
      try {
        const job = await prisma.job.findUnique({...});
        logger.info({ jobId: input.jobId, duration: Date.now() - start });
        return job;
      } catch (error) {
        logger.error({ jobId: input.jobId, error });
        throw error;
      }
    })
});
```

---

## Future Enhancements

### Offline Support

**Problem:** Technicians work in areas with poor connectivity.

**Solution:**
- Queue mutations in IndexedDB
- Sync when connection restored
- Conflict resolution (last-write-wins or manual merge)

**Implementation:**
```typescript
// Optimistic update
const mutation = trpc.serviceRecord.checkIn.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['job', 'listActive']);

    // Snapshot previous value
    const previous = queryClient.getQueryData(['job', 'listActive']);

    // Optimistically update
    queryClient.setQueryData(['job', 'listActive'], (old) => [...old, newData]);

    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['job', 'listActive'], context.previous);
  }
});
```

### Real-Time Updates

**Problem:** Multiple technicians working on same equipment.

**Solution:**
- WebSocket connection for live updates
- Server pushes job status changes
- Client updates UI without polling

**Implementation:**
```typescript
// tRPC subscriptions
export const jobRouter = t.router({
  onStatusChange: t.procedure
    .input(z.object({ jobId: z.string() }))
    .subscription(async ({ input }) => {
      return observable<Job>((emit) => {
        const listener = (job: Job) => {
          if (job.id === input.jobId) emit.next(job);
        };
        eventEmitter.on('job:updated', listener);
        return () => eventEmitter.off('job:updated', listener);
      });
    })
});
```

### Photo Compression

**Problem:** 4 photos at 5MB each = 20MB upload on cellular.

**Solution:**
- Compress on device before upload
- Target 500KB per photo
- Maintain aspect ratio and quality

**Implementation:**
```typescript
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const compressedImage = await manipulateAsync(
  photo.uri,
  [{ resize: { width: 1920 } }],  // Max width
  { compress: 0.7, format: SaveFormat.JPEG }
);
```

---

## Lessons Learned

### What Worked Well

1. **tRPC + Prisma:** Type safety caught bugs before runtime
2. **Monorepo:** Shared types eliminated API drift
3. **Docker Compose:** Consistent development environment
4. **AsyncStorage:** Draft persistence prevented data loss

### What Could Be Better

1. **Testing:** Should have written tests from day one
2. **Error Handling:** Too many generic "Something went wrong" messages
3. **Photo Upload:** Should be async (blocks UI currently)
4. **Documentation:** Should have documented as we built

### If Starting Over

1. Set up CI/CD pipeline first
2. Write integration tests for critical paths
3. Add structured logging from the start
4. Design offline support into architecture (not bolt-on later)
