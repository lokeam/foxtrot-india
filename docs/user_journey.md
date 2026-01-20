# User Journey: Field Technician Workflow

## Overview

Heavy equipment field technicians document service work using a two-step workflow that separates arrival state from completion state. This prevents data loss if the app crashes mid-job and creates a clear audit trail of before/after conditions.

## State Machine

```
ASSIGNED → IN_PROGRESS → COMPLETED
   ↓           ↓             ↓
Check-In   Complete Job   Edit (Revision)
```

### Job States

- **ASSIGNED**: Job created, waiting for technician to arrive
- **IN_PROGRESS**: Technician checked in, working on equipment
- **COMPLETED**: Job finished, before/after documentation complete

## Two-Step Process

### Step 1: Check-In (Arrival)

**When:** Technician arrives at job site

**Captures:**
- Before photos (1-4 images)
- Initial notes
- Starting engine hours
- Arrival timestamp

**Database Changes:**
- Creates `ServiceRecord` with before-state data
- Updates `Job.status` to `IN_PROGRESS`
- Transaction ensures atomic state change

**Draft Persistence:**
- Form data auto-saves to AsyncStorage every 2 seconds
- On app restart, offers to resume draft
- Prevents data loss from crashes or interruptions

### Step 2: Complete Job (After Repair)

**When:** Technician finishes repair work

**Captures:**
- After photos (1-4 images)
- Diagnosis (what was wrong)
- Work performed (what was done)
- Parts used (optional)
- Ending engine hours
- Completion timestamp

**Database Changes:**
- Updates `ServiceRecord` with after-state data
- Updates `Job.status` to `COMPLETED`
- Sets `isJobComplete` flag
- Transaction ensures consistency

**Validation:**
- After engine hours must be ≥ before engine hours
- Diagnosis and work performed are required
- Photos recommended but optional

## Revision Tracking

### Why Revisions Matter

Technicians sometimes need to correct documentation after marking a job complete. Rather than preventing edits (data integrity) or allowing silent updates (no audit trail), we track revisions explicitly.

### How It Works

**Edit Check-In:**
- Updates before photos, notes, or engine hours
- Only allowed for `COMPLETED` jobs
- Does NOT increment revision count (before-state corrections don't affect diagnosis)

**Edit Completion:**
- Updates diagnosis, work performed, parts, after photos, or after hours
- Only allowed for `COMPLETED` jobs
- Increments `revisionCount` by 1
- Sets `revisedAt` to current timestamp
- Shows orange "Revised (N)" badge on job cards

**Database Implementation:**
```sql
UPDATE service_records
SET
  diagnosis = $1,
  work_performed = $2,
  revised_at = NOW(),
  revision_count = revision_count + 1
WHERE id = $3 AND job_id IN (
  SELECT id FROM jobs WHERE status = 'COMPLETED'
)
```

### UI Behavior

**Job Detail Screen (COMPLETED jobs):**
- Shows "Edit Check-In" button
- Shows "Edit Completion" button
- Both navigate to respective edit screens with pre-filled data

**Active Jobs Screen:**
- Completed jobs show green "Completed" badge
- If `revisionCount > 0`, shows orange "Revised (N)" badge next to status
- Badge updates immediately after edit (cache invalidation)

## Photo Upload Flow

### Mobile → API → Storage

1. **Capture:** User takes photo with device camera
2. **Encode:** Convert to base64 string
3. **Upload:** POST to `/upload` endpoint with base64 data
4. **Store:** API writes to Supabase Storage bucket
5. **Return:** API returns public URL
6. **Save:** URL stored in `beforePhotos` or `afterPhotos` array

### Error Handling

- Network failures: Show retry option
- Storage failures: Log error, allow submission without photos
- Invalid image format: Validate before upload attempt

## Draft Recovery

### Problem

Mobile apps can crash, users can accidentally close the app, or iOS can kill background processes. Losing 10 minutes of form data is unacceptable for field technicians.

### Solution

**Auto-Save:**
- Every 2 seconds, serialize form state to AsyncStorage
- Key format: `draft_checkin_{jobId}` or `draft_complete_{serviceRecordId}`
- Includes: text fields, engine hours, photo URIs

**Recovery:**
- On screen mount, check for existing draft
- If found, show alert: "Resume Draft?" with Discard/Resume options
- Resume: Pre-fill all form fields with saved data
- Discard: Delete draft, start fresh

**Cleanup:**
- Draft deleted on successful submission
- Draft persists across app restarts until explicitly discarded

## Cache Invalidation

### Problem

React Query caches API responses. After editing a completed job, the job list still shows old data until manual refresh.

### Solution

After successful edit mutation:
```typescript
await updateCompletionMutation.mutateAsync({...});
await utils.job.byId.invalidate({ jobId });
await utils.job.listActive.invalidate();
await utils.job.listCompleted.invalidate();
```

This forces immediate refetch of:
- Job detail (shows updated data)
- Active jobs list (updates badge)
- Completed jobs list (updates badge)

User sees revision badge appear instantly without pull-to-refresh.

## State Transitions

### Valid Transitions

```
ASSIGNED → IN_PROGRESS  (Check-In)
IN_PROGRESS → COMPLETED (Complete Job)
COMPLETED → COMPLETED   (Edit - no state change)
```

### Invalid Transitions

- Cannot complete job without check-in (enforced by UI)
- Cannot check in twice (UI hides button after first check-in)
- Cannot edit non-completed jobs (mutation validates job status)

## Atomic Operations

All state changes use Prisma transactions:

```typescript
await prisma.$transaction([
  prisma.serviceRecord.create({...}),
  prisma.job.update({ status: 'IN_PROGRESS' })
]);
```

If either operation fails, both are rolled back. This prevents:
- ServiceRecord existing without job status update
- Job status changing without ServiceRecord
- Partial data corruption

## Future Enhancements

**Offline Support:**
- Queue mutations when offline
- Sync when connection restored
- Conflict resolution for concurrent edits

**Photo Compression:**
- Reduce upload size (currently raw JPEG)
- Maintain quality for documentation purposes
- Balance between file size and detail visibility

**Revision History:**
- Store previous versions of diagnosis/work performed
- Show diff view of changes
- Audit trail for compliance
