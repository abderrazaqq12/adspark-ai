/**
 * UGC Project Enforcer Middleware
 * Ensures all UGC operations are scoped to a valid project
 * Part of FlowScale's Project Contract
 */

import db from '../local-db.js';

/**
 * Middleware to enforce project context on UGC routes
 * Blocks execution if no valid projectId is provided
 */
export function enforceUGCProject(req, res, next) {
    const projectId = req.body?.projectId || req.query?.projectId || req.headers['x-project-id'];

    if (!projectId) {
        console.warn(`[UGC Contract] Blocked: No projectId provided for ${req.method} ${req.path}`);
        return res.status(400).json({
            ok: false,
            error: {
                stage: 'validation',
                engine: 'project-enforcer',
                reason: 'Project context required. Please select a project before using UGC Generator.',
                retryable: false
            }
        });
    }

    // Validate project exists (using local DB)
    try {
        const project = db.prepare('SELECT id, name FROM projects WHERE id = ?').get(projectId);

        if (!project) {
            console.warn(`[UGC Contract] Blocked: Project ${projectId} not found for ${req.method} ${req.path}`);
            return res.status(404).json({
                ok: false,
                error: {
                    stage: 'validation',
                    engine: 'project-enforcer',
                    reason: `Project not found: ${projectId}. Please select a valid project.`,
                    retryable: false
                }
            });
        }

        // Attach project to request for downstream use
        req.ugcProject = project;
        console.log(`[UGC Contract] Project ${project.name} (${project.id}) validated for ${req.method} ${req.path}`);
        next();
    } catch (err) {
        console.error(`[UGC Contract] Database error:`, err);
        return res.status(500).json({
            ok: false,
            error: {
                stage: 'validation',
                engine: 'project-enforcer',
                reason: 'Failed to validate project. Database error.',
                retryable: true
            }
        });
    }
}

/**
 * Optional middleware - allows operation without project but logs warning
 * Used for demo/development mode
 */
export function warnWithoutProject(req, res, next) {
    const projectId = req.body?.projectId || req.query?.projectId || req.headers['x-project-id'];

    if (!projectId) {
        console.warn(`[UGC Contract] WARNING: No projectId for ${req.method} ${req.path} - running in unscoped mode`);
        req.ugcProject = null;
    } else {
        try {
            const project = db.prepare('SELECT id, name FROM projects WHERE id = ?').get(projectId);
            req.ugcProject = project || null;
        } catch (e) {
            req.ugcProject = null;
        }
    }

    next();
}
