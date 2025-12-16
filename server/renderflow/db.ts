import Database from 'better-sqlite3';
import path from 'path';
import { Job, JobState, JobInput, JobResult, JobError, ERROR_CODES } from './types';
import { PATHS } from './utils';

const dbPath = path.join(PATHS.DATA, 'renderflow.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize Schema
const initSchema = () => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      variation_id TEXT,
      project_id TEXT,
      state TEXT,
      created_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      input_json TEXT,
      output_json TEXT,
      error_json TEXT,
      progress_pct INTEGER DEFAULT 0,
      worker_pid INTEGER
    )
  `);
};
initSchema();

// Prepared Statements
const insertStmt = db.prepare(`
  INSERT INTO jobs (id, variation_id, project_id, state, created_at, input_json)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getStmt = db.prepare('SELECT * FROM jobs WHERE id = ?');

const updateStateStmt = db.prepare(`
  UPDATE jobs 
  SET state = ?, worker_pid = ?, started_at = COALESCE(started_at, ?)
  WHERE id = ?
`);

const completeStmt = db.prepare(`
  UPDATE jobs 
  SET state = 'done', completed_at = ?, output_json = ?, progress_pct = 100, worker_pid = NULL
  WHERE id = ?
`);

const failStmt = db.prepare(`
  UPDATE jobs 
  SET state = 'failed', completed_at = ?, error_json = ?, worker_pid = NULL
  WHERE id = ?
`);

const updateProgressStmt = db.prepare(`
  UPDATE jobs SET progress_pct = ? WHERE id = ?
`);

const lockJobStmt = db.prepare(`
  UPDATE jobs 
  SET state = 'preparing', worker_pid = ?, started_at = ?
  WHERE id = (
    SELECT id FROM jobs 
    WHERE state = 'queued' 
    ORDER BY created_at ASC 
    LIMIT 1
  )
  RETURNING *
`);

// API
export const RenderFlowDB = {

    insertJob: (job: Job) => {
        insertStmt.run(
            job.id,
            job.variation_id,
            job.project_id,
            job.state,
            job.created_at,
            JSON.stringify(job.input)
        );
    },

    getJob: (id: string): Job | undefined => {
        const row = getStmt.get(id) as any;
        if (!row) return undefined;
        return mapRowToJob(row);
    },

    // Atomic Lock & Claim
    claimNextJob: (workerPid: number): Job | undefined => {
        const now = new Date().toISOString();
        try {
            const row = lockJobStmt.get(workerPid, now) as any;
            if (!row) return undefined;
            return mapRowToJob(row);
        } catch (err) {
            console.error('DB Error claiming job:', err);
            return undefined;
        }
    },

    updateState: (id: string, state: JobState, workerPid?: number) => {
        const now = state === 'preparing' ? new Date().toISOString() : null; // Only update started_at if preparing
        updateStateStmt.run(state, workerPid || null, now, id);
    },

    updateProgress: (id: string, pct: number) => {
        updateProgressStmt.run(pct, id);
    },

    markDone: (id: string, output: JobResult) => {
        const now = new Date().toISOString();
        completeStmt.run(now, JSON.stringify(output), id);
    },

    markFailed: (id: string, error: JobError) => {
        const now = new Date().toISOString();
        failStmt.run(now, JSON.stringify(error), id);
    },

    recoverOrphanedJobs: () => {
        // Non-terminal states
        const activeStates = ['preparing', 'downloading', 'processing', 'encoding', 'muxing', 'finalizing'];
        const placeholders = activeStates.map(() => '?').join(',');

        const orphaned = db.prepare(`SELECT id FROM jobs WHERE state IN (${placeholders})`).all(...activeStates) as { id: string }[];

        if (orphaned.length > 0) {
            console.log(`[RenderFlow] Recovering ${orphaned.length} orphaned jobs...`);
            const now = new Date().toISOString();
            const failRecoveryStmt = db.prepare(`
        UPDATE jobs 
        SET state = 'failed', completed_at = ?, error_json = ?, worker_pid = NULL 
        WHERE id = ?
      `);

            const error = JSON.stringify({
                code: ERROR_CODES.SYSTEM,
                message: 'Job failed due to system crash/restart'
            });

            const tx = db.transaction(() => {
                for (const job of orphaned) {
                    failRecoveryStmt.run(now, error, job.id);
                }
            });
            tx();
        }
    }
};

function mapRowToJob(row: any): Job {
    return {
        id: row.id,
        variation_id: row.variation_id,
        project_id: row.project_id,
        state: row.state as JobState,
        created_at: row.created_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        input: JSON.parse(row.input_json || '{}'),
        output: row.output_json ? JSON.parse(row.output_json) : undefined,
        error: row.error_json ? JSON.parse(row.error_json) : undefined,
        progress_pct: row.progress_pct,
        worker_pid: row.worker_pid
    };
}
