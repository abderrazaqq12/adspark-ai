# Project System Endpoint Updates

## Endpoints to Update Manually

The following endpoints need manual updates since they use a different structure (internal `handleExecute` function):

### 1. POST /api/upload (Line 1738)

**Current:**
```javascript
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    // ... existing upload logic
  });
});
```

**Update to:**
```javascript
app.post('/api/upload', upload.single('file'), enforceProject(), async (req, res) => {
  const { projectId } = req.body;
  const project = req.project;
  
  // Existing validation...
  if (!req.file) {
    return jsonError(res, 400, 'NO_FILE', 'No file provided');
  }
  
  // Existing logic...
  const filePath = path.join(req.file.destination, req.file.filename);
  const publicUrl = `/uploads/${req.body.projectId ? req.body.projectId + '/' : ''}${req.file.filename}`;
  
  // ADD: Track resource
  try {
    const fileId = crypto.randomBytes(8).toString('hex');
    await trackResource(projectId, {
      type: 'file',
      id: fileId,
      path: filePath,
      size: req.file.size,
      metadata: {
        original_name: req.file.originalname,
        mime_type: req.file.mimetype
      }
    });
  } catch (err) {
    console.warn('[Upload] Resource tracking failed:', err.message);
  }
  
  // Existing response...
  res.json({...});
});
```

### 2. Internal handleExecute function (Line 1836)

This function is called by multiple endpoints. Add project tracking:

**Find:**
```javascript
function handleExecute(req, res) {
  // ... existing logic
  const jobId = outputName || generateJobId();
```

**Add after job creation:**
```javascript
  // Track job as resource
  const projectId = req.body.projectId;
  if (projectId) {
    trackResource(projectId, {
      type: 'job',
      id: jobId,
      metadata: {
        status: 'queued',
        engine: 'ffmpeg'
      }
    }).catch(err => console.warn('[Execute] Resource tracking failed:', err.message));
  }
```

### 3. POST /api/execute (if separate endpoint exists)

Add `enforceProject()` middleware to the route definition.

### 4. POST /api/execute-plan (if separate endpoint exists)

Add `enforceProject()` middleware to the route definition.

## Already Added

✅ Imports added to api.js:
```javascript
import { trackResource } from './project-manager.js';
import { enforceProject } from './middleware/project-enforcer.js';
```

## Testing After Manual Updates

```bash
# Test enforcement
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.mp4" \
  -F "projectId=invalid-id"
# Should return PROJECT_NOT_FOUND

curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.mp4"
# Should return PROJECT_REQUIRED
```

## Note

The api.js file has a complex structure with internal handlers. The imports are in place. Manual edits to specific lines are required to add:

1. `enforceProject()` middleware to routes
2. `trackResource()` calls after operations

See lines indicated above for exact locations.
