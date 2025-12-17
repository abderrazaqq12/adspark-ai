# RenderFlow v2

A robust, self-contained rendering backend service for FlowScale.

## Architecture

- **Single Process**: The service runs as a single Node.js process (`server.cjs`).
- **Worker**: An internal polling loop runs within the main process to execute jobs.
- **Database**: Local SQLite (`data/jobs.db`) with WAL mode for high performance and atomic locking.
- **Validation**: Strict fail-fast validation against `job.schema.json` using Zod.
- **Logging**: FFmpeg execution logs are written to `temp/<jobId>_ffmpeg.log`.

## Usage

### Start Service
```bash
node server/renderflow/server.cjs
# OR with PM2
pm2 start server/renderflow/ecosystem.config.cjs
```

### Submit Job
**POST** `/render/jobs`
```json
{
  "source_url": "https://example.com/video.mp4",
  "output_format": "mp4",
  "resolution": "1280x720"
}
```

### Check Status
**GET** `/render/jobs/:id`

## Directory Structure
- `data/`: SQLite database.
- `temp/`: Intermediate files and logs.
- `output/`: Final rendered videos.
- `server.cjs`: Main entry point (API + Worker).
- `worker.cjs`: Job processing logic.
- `db.cjs`: Database layer.
- `job.schema.json`: Contract.
