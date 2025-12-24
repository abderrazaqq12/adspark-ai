import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// VPS Single User Mode - Local Database
// Stores projects and resources without Supabase dependency

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'flowscale.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// FORCE RESET (Logic Removed for Stability)
// The database is now persistent.

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');



// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    product_name TEXT,
    language TEXT DEFAULT 'en',
    settings TEXT,
    status TEXT DEFAULT 'active',
    google_drive_folder_id TEXT,
    google_drive_folder_link TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS project_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    resource_path TEXT,
    size_bytes INTEGER DEFAULT 0,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS execution_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    job_id TEXT,
    category TEXT,
    message TEXT,
    stack TEXT,
    resolved BOOLEAN DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS execution_state (
    job_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    next_retry_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS video_outputs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    job_id TEXT,
    type TEXT DEFAULT 'video',
    output_url TEXT,
    thumbnail_url TEXT,
    duration_sec REAL,
    size_bytes INTEGER,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    raw_text TEXT,
    language TEXT,
    tone TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    script_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    sequence_index INTEGER NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    duration_ms INTEGER,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(script_id) REFERENCES scripts(id),
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS generated_images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    url TEXT,
    type TEXT,
    prompt TEXT,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS audio_tracks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    script_id TEXT,
    url TEXT,
    name TEXT,
    provider TEXT,
    voice_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS prompt_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    system_prompt TEXT,
    user_prompt TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cost_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT,
    service TEXT,
    model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_resources_project ON project_resources(project_id);
  CREATE INDEX IF NOT EXISTS idx_errors_project ON execution_errors(project_id);
  CREATE INDEX IF NOT EXISTS idx_errors_job ON execution_errors(job_id);
  CREATE INDEX IF NOT EXISTS idx_outputs_project ON video_outputs(project_id);
  CREATE INDEX IF NOT EXISTS idx_outputs_job ON video_outputs(job_id);
  CREATE INDEX IF NOT EXISTS idx_scripts_project ON scripts(project_id);
  CREATE INDEX IF NOT EXISTS idx_scenes_script ON scenes(script_id);
  CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
  CREATE INDEX IF NOT EXISTS idx_images_project ON generated_images(project_id);
  CREATE INDEX IF NOT EXISTS idx_audio_project ON audio_tracks(project_id);
  CREATE INDEX IF NOT EXISTS idx_costs_project ON cost_logs(project_id);
`);

// Auto-Migration: Blindly try to add column (safe ignore if exists)
try {
  db.exec('ALTER TABLE projects ADD COLUMN google_drive_folder_link TEXT');
  console.log('[LocalDB] Migrated: Added google_drive_folder_link');
} catch (e) {
  // Ignore "duplicate column name" error
}

console.log(`[LocalDB] ✅ Initialized at ${DB_PATH} `);

export default db;
