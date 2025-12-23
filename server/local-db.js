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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
  
  CREATE INDEX IF NOT EXISTS idx_resources_project ON project_resources(project_id);

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
  
  CREATE INDEX IF NOT EXISTS idx_errors_project ON execution_errors(project_id);
  CREATE INDEX IF NOT EXISTS idx_errors_job ON execution_errors(job_id);

  CREATE TABLE IF NOT EXISTS execution_state (
    job_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    next_retry_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log(`[LocalDB] ✅ Initialized at ${DB_PATH}`);

export default db;
