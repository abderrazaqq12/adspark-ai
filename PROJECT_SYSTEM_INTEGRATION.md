# Project System Integration Guide

Quick reference for integrating the Project System into existing and new endpoints.

## Adding Project Enforcement to Endpoints

### Step 1: Import the middleware

```javascript
import { enforceProject } from './middleware/project-enforcer.js';
```

### Step 2: Add to route

```javascript
// Before
app.post('/api/your-endpoint', async (req, res) => {
  // ...
});

// After
app.post('/api/your-endpoint', enforceProject(), async (req, res) => {
  const { projectId } = req.body;
  const project = req.project; // Validated project object
  // ...
});
```

### Step 3: Track resources

```javascript
import { trackResource } from './project-manager.js';

// After creating a resource
await trackResource(projectId, {
  type: 'output',  // 'file', 'output', 'job', 'log', 'drive_file'
  id: resourceId,
  path: resourcePath,
  size: fileSize,
  metadata: { /* any extra data */ }
});
```

## Endpoints to Update

### High Priority (Video Generation)

- [x] `/api/projects/*` - Already enforced
- [ ] `/api/execute` - Video rendering
- [ ] `/api/execute-plan` - Plan-based rendering
- [ ] `/api/upload` - File uploads

### Medium Priority (Asset Management)

- [ ] `/api/jobs/:id` - Job status (read-only, optional enforcement)
- [ ] `/api/health` - Health check (no enforcement needed)

### Edge Functions (Supabase)

All Edge Functions should validate project ownership via RLS:

```typescript
const { data: project } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();

if (!project) {
  return new Response(JSON.stringify({ error: 'PROJECT_NOT_FOUND' }), {
    status: 404
  });
}
```

## Example: Update `/api/execute`

```javascript
app.post('/api/execute', enforceProject(), async (req, res) => {
  const { projectId } = req.body;
  const project = req.project;
  
  // Validate input
  if (!req.body.input) {
    return jsonError(res, 400, 'INVALID_INPUT', 'Missing input configuration');
  }
  
  // Create job with project context
  const jobId = generateJobId();
  const job = createJob(jobId, 'render', {
    ...req.body,
    projectId,
    driveFolderId: project.google_drive_folder_id
  });
  
  // Track job as project resource
  await trackResource(projectId, {
    type: 'job',
    id: jobId,
    metadata: {
      type: job.type,
      status: job.status,
      engine: job.input?.engine || 'ffmpeg'
    }
  });
  
  // Queue job
  pendingQueue.push(jobId);
  processNextJob();
  
  res.json({
    ok: true,
    jobId,
    projectId,
    message: 'Job queued successfully'
  });
});
```

## Testing

### Verify Enforcement

```bash
# Should fail with PROJECT_REQUIRED
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{ "input": {} }'

# Should succeed
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "valid-uuid", "input": {} }'
```

### Verify Resource Tracking

```sql
-- Check tracked resources
SELECT * FROM project_resources 
WHERE project_id = 'your-project-id';

-- Check resource stats
SELECT resource_stats FROM projects 
WHERE id = 'your-project-id';
```
