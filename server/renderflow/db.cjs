const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the SQLite database file
const dbPath = path.join(__dirname, 'data', 'jobs.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize Database with WAL mode for performance and concurrency
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    error TEXT,
    output_path TEXT,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER
  );
`);

// Prepared statements for performance
const insertJobStmt = db.prepare('INSERT INTO jobs (id, status, data, created_at) VALUES (?, ?, ?, ?)');
const getJobStmt = db.prepare('SELECT * FROM jobs WHERE id = ?');

/**
 * Add a new job to the queue.
 * @param {string} id - UUID of the job
 * @param {object} data - Validated job payload
 */
function addJob(id, data) {
    const info = insertJobStmt.run(id, 'pending', JSON.stringify(data), Date.now());
    return info.changes > 0;
}

/**
 * Get a job by ID.
 * @param {string} id 
 */
function getJob(id) {
    const job = getJobStmt.get(id);
    if (job) {
        // Parse JSON data for convenience
        try {
            job.data = JSON.parse(job.data);
        } catch (e) {
            job.data = {};
        }
    }
    return job;
}

/**
 * Atomically claim the next pending job.
 * Race-safe implementation using a transaction and verify-update pattern.
 * @returns {object|null} The claimed job object or null if queue is empty.
 */
const claimJob = db.transaction(() => {
    // 1. Find the oldest pending job
    const candidate = db.prepare("SELECT id FROM jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 1").get();

    if (!candidate) return null;

    // 2. Atomically attempt to lock it
    const now = Date.now();
    const result = db.prepare(
        "UPDATE jobs SET status='processing', started_at=? WHERE id=? AND status='pending'"
    ).run(now, candidate.id);

    // 3. If no rows were updated, another worker claimed it or it's no longer pending
    if (result.changes === 0) return null;

    // 4. Return the authoritative updated job record
    return getJob(candidate.id);
});

/**
 * Mark a job as successful.
 * @param {string} id 
 * @param {string} outputPath 
 */
function completeJob(id, outputPath) {
    const info = db.prepare("UPDATE jobs SET status='done', completed_at=?, output_path=? WHERE id=?")
        .run(Date.now(), outputPath, id);
    return info.changes > 0;
}

/**
 * Mark a job as failed.
 * @param {string} id 
 * @param {string} errorMessage 
 */
function failJob(id, errorMessage) {
    const info = db.prepare("UPDATE jobs SET status='failed', completed_at=?, error=? WHERE id=?")
        .run(Date.now(), errorMessage, id);
    return info.changes > 0;
}

module.exports = {
    db, // Export raw db if needed
    addJob,
    getJob,
    claimJob,
    completeJob,
    failJob
};
