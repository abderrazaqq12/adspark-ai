# Error Observability System - Integration Example

Demonstrates how to integrate the error handler into existing job execution code.

## Integration Pattern

### Before (Old Code)

```javascript
try {
  await executeFFmpegJob(job);
  updateJob(job.id, { status: 'completed' });
} catch (error) {
  console.error('[Job] Failed:', error);
  updateJob(job.id, { 
    status: 'failed',
    error: error.message  // ❌ Generic error message
  });
}
```

### After (With Error Handler)

```javascript
import { errorHandler } from './error-handler.js';

try {
  await executeFFmpegJob(job);
  updateJob(job.id, { status: 'completed' });
  
} catch (error) {
  // Handle error with categorization and recovery
  const { error: errorRecord, decision } = await errorHandler.handle(error, {
    projectId: job.projectId,
    jobId: job.id,
    userId: job.userId,
    stage: 'ffmpeg_encoding'  // Specific stage for better categorization
  });
  
  if (decision.shouldRetry) {
    // Schedule automatic retry
    console.log(`[Job ${job.id}] ${decision.message}`);
    await errorHandler.scheduleRetry(job.id, decision.delayMs);
    
    // Job stays in queue for retry
  } else {
    // Fatal error - mark job as failed
    console.error(`[Job ${job.id}] Fatal: ${errorRecord.message}`);
    updateJob(job.id, { 
      status: 'failed',
      error: errorRecord.message,
      error_code: errorRecord.error_code,
      error_id: errorRecord.id
    });
  }
}
```

## Common Integration Points

### 1. File Download Stage

```javascript
try {
  const filePath = await downloadFile(url);
} catch (error) {
  await errorHandler.handle(error, {
    projectId,
    jobId,
    userId,
    stage: 'download'  // Will categorize as NETWORK_ERROR
  });
}
```

### 2. Input Validation Stage

```javascript
try {
  validateInputs(req.body);
} catch (error) {
  await errorHandler.handle(error, {
    projectId,
    jobId,
    userId,
    stage: 'validation'  // Will categorize as INPUT_ERROR
  });
}
```

### 3. Storage Operations

```javascript
try {
  await uploadToGoogleDrive(file);
} catch (error) {
  await errorHandler.handle(error, {
    projectId,
    jobId,
    userId,
    stage: 'upload'  // Will categorize as STORAGE_ERROR
  });
}
```

## Stages Reference

| Stage | Typical Error Category |
|-------|----------------------|
| `validation` | INPUT_ERROR |
| `plan_validation` | PLAN_ERROR |
| `download` | NETWORK_ERROR |
| `ffmpeg` | FFMPEG_ERROR |
| `encode` | FFMPEG_ERROR |
| `upload` | STORAGE_ERROR |
| `storage` | STORAGE_ERROR |
| `auth` | AUTH_ERROR |

## Testing Error Handling

### Test Retry Logic

```javascript
// Simulate network error
const error = new Error('ETIMEDOUT');
const { decision } = await errorHandler.handle(error, {
  projectId: 'test-project',
  jobId: 'test-job',
  userId: 'test-user',
  stage: 'download'
});

console.log(decision);
// {
//   action: 'RETRY',
//   shouldRetry: true,
//   delayMs: 2000,
//   message: 'Will retry in 2000ms (attempt 1/3)'
// }
```

### Test Abort Logic

```javascript
// Simulate invalid input
const error = new Error('No source file provided');
const { decision } = await errorHandler.handle(error, {
  projectId: 'test-project',
  jobId: 'test-job',
  userId: 'test-user',
  stage: 'validation'
});

console.log(decision);
// {
//   action: 'ABORT',
//   shouldRetry: false,
//   message: 'Please provide a valid video source file or URL'
// }
```

## Next Steps

1. Update existing `try-catch` blocks to use `errorHandler.handle()`
2. Specify correct `stage` for each integration point
3. Test with various error scenarios
4. Monitor error logs via `/api/projects/:id/errors`
