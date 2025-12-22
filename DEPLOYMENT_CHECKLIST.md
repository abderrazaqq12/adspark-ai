# FlowScale Deployment Checklist

## Systems Ready for Deployment

### 1. Project System ✅
### 2. Error Observability System ✅

---

## Deployment Steps

### Step 1: Apply Database Migrations

```bash
cd c:\Users\conta\adspark-ai\supabase
supabase migration up
```

**Expected migrations:**
```
✓ 20251222181345_project_system_enhancements.sql
✓ 20251222200920_error_observability_system.sql
```

### Step 2: Restart Backend Server

```bash
cd c:\Users\conta\adspark-ai\server
node api.js
```

**Expected output:**
```
[Security] ✅ Environment validated
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FlowScale VPS Render Gateway API
🌐 Server: http://127.0.0.1:3000
🎬 FFmpeg: ✅ Available
```

### Step 3: Test Project System

```bash
# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user-id" \
  -d '{"name": "Test Project", "description": "Testing deployment"}'

# List projects
curl http://localhost:3000/api/projects \
  -H "X-User-Id: test-user-id"
```

### Step 4: Test Error Observability

```bash
# Trigger an error (missing projectId)
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test.mp4"

# Should return: PROJECT_REQUIRED error

# Query errors (replace PROJECT_ID)
curl http://localhost:3000/api/projects/PROJECT_ID/errors

# Get error stats
curl http://localhost:3000/api/projects/PROJECT_ID/error-stats
```

### Step 5: Test Frontend Integration

1. Open Lovable application
2. Create a new project via UI
3. Upload a file → Should succeed with projectId
4. Try rendering → Should queue job with projectId

---

## Verification Checklist

### Project System
- [ ] Migration applied successfully
- [ ] Projects table has new columns (status, resource_stats)
- [ ] project_resources table exists
- [ ] project_drive_sync table exists
- [ ] Can create project via API
- [ ] Can list projects
- [ ] Upload fails without projectId
- [ ] Resources are tracked in project_resources

### Error Observability
- [ ] Migration applied successfully
- [ ] execution_errors table exists
- [ ] execution_state table exists
- [ ] Error APIs return data
- [ ] Error stats function works
- [ ] Errors are categorized (no "unknown")

### Integration
- [ ] Server starts without errors
- [ ] ENV validation passes
- [ ] FFmpeg detected
- [ ] All imports resolve correctly
- [ ] No console errors on startup

---

## Troubleshooting

### Migration Fails

**Check if already applied:**
```bash
supabase migration list
```

**Revert last migration (if needed):**
```bash
supabase migration down
```

### Server Won't Start

**Check imports:**
```bash
node --check server/api.js
```

**Common issues:**
- Missing module: Run `npm install`
- Syntax error: Check recent edits
- Port in use: Kill process on port 3000

### Tests Fail

**Check Supabase connection:**
```javascript
// In server console
const { data } = await supabase.from('projects').select('*').limit(1);
console.log(data);
```

---

## Files Summary

### Created Files

**Database:**
- `supabase/migrations/20251222181345_project_system_enhancements.sql`
- `supabase/migrations/20251222200920_error_observability_system.sql`

**Project System:**
- `server/project-manager.js`
- `server/middleware/project-enforcer.js`
- `server/drive-manager.js`

**Error System:**
- `server/error-definitions.js`
- `server/error-handler.js`
- `server/ffmpeg-error-parser.js`
- `server/state-manager.js`

**Documentation:**
- `PROJECT_SYSTEM_INTEGRATION.md`
- `PROJECT_SYSTEM_SUMMARY.md`
- `PROJECT_SYSTEM_STATUS.md`
- `ERROR_HANDLER_INTEGRATION.md`
- `ENDPOINT_UPDATES_REQUIRED.md`

**Modified:**
- `server/api.js` (added imports, APIs, project enforcement, error APIs)

---

## Post-Deployment

### Monitor Errors

```bash
# Watch error log
curl http://localhost:3000/api/projects/PROJECT_ID/errors?limit=10

# Check error stats
curl http://localhost:3000/api/projects/PROJECT_ID/error-stats
```

### Verify Resource Tracking

```sql
-- In Supabase SQL editor
SELECT 
  resource_type,
  COUNT(*) as count,
  SUM(size_bytes) as total_bytes
FROM project_resources
WHERE project_id = 'your-project-id'
GROUP BY resource_type;
```

---

## Success Criteria

✅ **Both migrations applied**  
✅ **Server starts without errors**  
✅ **Projects can be created**  
✅ **Upload requires projectId**  
✅ **Errors are categorized**  
✅ **Error APIs return data**  

**System is production-ready when all criteria met!**
