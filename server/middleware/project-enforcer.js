/**
 * FlowScale Project Enforcement Middleware
 * 
 * Ensures all operations belong to a valid, active Project.
 * Implements the core architectural rule: NO OPERATIONS WITHOUT PROJECT.
 */

import { validateProject } from '../project-manager.js';

/**
 * Middleware to enforce project context on API endpoints
 * 
 * Usage:
 *   app.post('/api/upload', enforceProject(), async (req, res) => { ... });
 *   app.post('/api/execute', enforceProject({ required: true }), async (req, res) => { ... });
 * 
 * @param {object} options - Enforcement options
 * @param {boolean} options.required - If true, projectId is mandatory (default: true)
 * @param {boolean} options.allowInactive - If true, allow archived/deleted projects (default: false)
 * @returns {Function} Express middleware
 */
function enforceProject(options = {}) {
    const {
        required = true,
        allowInactive = false
    } = options;

    return async (req, res, next) => {
        // Extract project_id from body, query, or params
        const projectId = req.body.projectId ||
            req.body.project_id ||
            req.query.projectId ||
            req.query.project_id ||
            req.params.projectId ||
            req.params.project_id;

        // If no projectId provided
        if (!projectId) {
            if (required) {
                return res.status(400).json({
                    ok: false,
                    error: {
                        code: 'PROJECT_REQUIRED',
                        message: 'All operations must belong to a Project. Please provide projectId in request body, query, or params.',
                        details: {
                            hint: 'Add { "projectId": "your-project-uuid" } to your request'
                        }
                    }
                });
            }
            // Not required, continue without project context
            return next();
        }

        // Validate project ID format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
            return res.status(400).json({
                ok: false,
                error: {
                    code: 'INVALID_PROJECT_ID',
                    message: 'Project ID must be a valid UUID',
                    details: { projectId }
                }
            });
        }

        // Get user ID from request (assumes auth middleware ran first)
        let userId = req.user?.id;

        // SINGLE-USER VPS BYPASS:
        // If no user is authenticated via Supabase, we assume the "admin" user owns everything
        // This is critical for the "No Auth" requirement.
        if (!userId) {
            if (process.env.VPS_MODE === 'true' || true) { // Always true for this restructuring
                userId = '00000000-0000-0000-0000-000000000000'; // Fixed Admin ID
                // Inject fake user for downstream consumers
                req.user = { id: userId, email: 'admin@local.vps', role: 'owner' };
                console.log(`[ProjectEnforcer] 🔓 VPS Mode: Implicitly authorized as Admin`);
            } else {
                return res.status(401).json({
                    ok: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required to access projects'
                    }
                });
            }
        }

        // Validate project exists and user has access
        try {
            const project = await validateProject(projectId, userId);

            // Check if project status is acceptable
            if (!allowInactive && project.status !== 'active') {
                return res.status(403).json({
                    ok: false,
                    error: {
                        code: 'PROJECT_INACTIVE',
                        message: `Project is ${project.status}. Only active projects can be modified.`,
                        details: {
                            projectId,
                            status: project.status,
                            hint: 'To modify this project, restore it to active status first'
                        }
                    }
                });
            }

            // Attach validated project context to request
            req.project = project;
            req.projectId = projectId;

            console.log(`[ProjectEnforcer] ✅ Validated project: ${project.name} (${projectId})`);
            next();

        } catch (validationError) {
            // Project validation failed
            const errorMessage = validationError.message || 'Unknown validation error';

            return res.status(404).json({
                ok: false,
                error: {
                    code: 'PROJECT_NOT_FOUND',
                    message: errorMessage,
                    details: {
                        projectId,
                        hint: 'Ensure the project exists and you have access to it'
                    }
                }
            });
        }
    };
}

/**
 * Express error handler for project-related errors
 * Use this AFTER your routes to catch any unhandled project errors
 */
function projectErrorHandler(err, req, res, next) {
    // If error is project-related, send formatted response
    if (err.code === 'PROJECT_REQUIRED' ||
        err.code === 'PROJECT_NOT_FOUND' ||
        err.code === 'PROJECT_INACTIVE') {
        return res.status(err.statusCode || 400).json({
            ok: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details || {}
            }
        });
    }

    // Otherwise, pass to next error handler
    next(err);
}

/**
 * Validates project context in async functions
 * Use this in functions that don't have Express req/res
 * 
 * @param {string} projectId - Project ID to validate
 * @param {string} userId - User ID for access control
 * @returns {Promise<object>} Validated project
 * @throws {Error} If validation fails
 */
async function requireProject(projectId, userId) {
    if (!projectId) {
        const error = new Error('Project ID is required for this operation');
        error.code = 'PROJECT_REQUIRED';
        error.statusCode = 400;
        throw error;
    }

    if (!userId) {
        const error = new Error('User ID is required for project validation');
        error.code = 'UNAUTHORIZED';
        error.statusCode = 401;
        throw error;
    }

    try {
        const project = await validateProject(projectId, userId);
        return project;
    } catch (err) {
        const error = new Error(err.message);
        error.code = 'PROJECT_NOT_FOUND';
        error.statusCode = 404;
        error.details = { projectId };
        throw error;
    }
}

export {
    enforceProject,
    projectErrorHandler,
    requireProject
};
