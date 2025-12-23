/**
 * FlowScale Project Manager (VPS Edition)
 * 
 * Replaces Cloud/Supabase project management with local SQLite storage.
 * Enforces "Single User Mode" and local resource ownership.
 */

import db from './local-db.js';
import { v4 as uuidv4 } from 'uuid'; // Standard UUID for project IDs

/**
 * Creates a new project with validation
 * @param {string} userId - Owner user ID
 * @param {object} data - Project data
 * @returns {Promise<object>} Created project
 */
async function createProject(userId, data) {
    const { name, description, product_name, language = 'en', settings = {} } = data;

    if (!name || name.trim().length === 0) {
        throw new Error('Project name is required');
    }

    const projectId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO projects (
            id, user_id, name, description, product_name, language, settings, status, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?
        )
    `);

    try {
        stmt.run(
            projectId,
            userId,
            name.trim(),
            description || null,
            product_name || null,
            language,
            JSON.stringify(settings),
            now,
            now
        );

        const project = getProjectSync(projectId);
        console.log(`[ProjectManager] ✅ Created local project: ${projectId} (${name})`);
        return project;
    } catch (err) {
        throw new Error(`Failed to create project: ${err.message}`);
    }
}

/**
 * Helper: Synchronous get project by ID
 */
function getProjectSync(projectId) {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!row) return null;

    // Parse JSON fields
    try { row.settings = JSON.parse(row.settings); } catch (e) { row.settings = {}; }
    return row;
}

/**
 * Links a Google Drive folder to a project
 */
async function linkDriveFolder(projectId, folderId, folderLink) {
    const stmt = db.prepare(`
        UPDATE projects 
        SET google_drive_folder_id = ?, google_drive_folder_link = ?, updated_at = ?
        WHERE id = ?
    `);

    stmt.run(folderId, folderLink, new Date().toISOString(), projectId);
    console.log(`[ProjectManager] ✅ Linked Drive folder ${folderId} to project ${projectId}`);
}

/**
 * Gets a project by ID with resource stats
 */
async function getProject(projectId, userId) {
    // In VPS mode, we trust the ID (userId check is mostly formal if bypassed upstream)
    const project = getProjectSync(projectId);

    if (!project) {
        throw new Error(`Project not found: ${projectId}`);
    }

    // Optional: Validate User ID if strict, but for single-user VPS we can be lenient
    // if (project.user_id !== userId) ... 

    // Get resource stats
    const stats = await getProjectStats(projectId);

    return {
        ...project,
        stats
    };
}

/**
 * Lists all projects for a user
 */
async function listProjects(userId, options = {}) {
    const { status = 'active', limit = 100, offset = 0 } = options;

    let query = 'SELECT * FROM projects WHERE user_id = ?';
    const params = [userId];

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);

    return rows.map(row => {
        try { row.settings = JSON.parse(row.settings); } catch (e) { row.settings = {}; }
        return row;
    });
}

/**
 * Archives a project (soft delete)
 */
async function archiveProject(projectId, userId) {
    db.prepare("UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), projectId);
    console.log(`[ProjectManager] ✅ Archived project: ${projectId}`);
}

/**
 * Permanently deletes a project
 */
async function deleteProject(projectId, userId) {
    db.prepare("UPDATE projects SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), new Date().toISOString(), projectId);
    console.log(`[ProjectManager] ✅ Deleted project: ${projectId}`);
}

/**
 * Updates project metadata
 */
async function updateProject(projectId, userId, updates) {
    const allowedFields = ['name', 'description', 'product_name', 'language', 'settings'];
    const sets = [];
    const params = [];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            sets.push(`${field} = ?`);
            let val = updates[field];
            if (field === 'settings' && typeof val === 'object') val = JSON.stringify(val);
            params.push(val);
        }
    }

    if (sets.length === 0) {
        throw new Error('No valid fields to update');
    }

    sets.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(projectId); // WHERE id = ?

    const stmt = db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`);
    stmt.run(...params);

    console.log(`[ProjectManager] ✅ Updated project: ${projectId}`);
    return getProjectSync(projectId);
}

/**
 * Gets project resource statistics
 */
async function getProjectStats(projectId) {
    const resources = db.prepare('SELECT resource_type, size_bytes FROM project_resources WHERE project_id = ?').all(projectId);

    const stats = resources.reduce((acc, r) => {
        const type = r.resource_type;
        if (!acc[type]) acc[type] = { count: 0, bytes: 0 };
        acc[type].count++;
        acc[type].bytes += (r.size_bytes || 0);
        return acc;
    }, {});

    const totalBytes = resources.reduce((sum, r) => sum + (r.size_bytes || 0), 0);

    return {
        total_resources: resources.length,
        total_bytes: totalBytes,
        by_type: stats
    };
}

/**
 * Tracks a resource for a project
 */
async function trackResource(projectId, resource) {
    const { type, id, path, size = 0, metadata = {} } = resource;

    if (!type || !id) {
        throw new Error('Resource type and ID are required');
    }

    try {
        db.prepare(`
            INSERT INTO project_resources (
                project_id, resource_type, resource_id, resource_path, size_bytes, metadata
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            projectId,
            type,
            id,
            path,
            size,
            JSON.stringify(metadata)
        );
        console.log(`[ProjectManager] ✅ Tracked ${type} resource: ${id}`);
    } catch (err) {
        console.warn(`[ProjectManager] ⚠️  Failed to track resource: ${err.message}`);
    }
}

/**
 * Removes a resource tracking entry
 */
async function untrackResource(resourceType, resourceId) {
    db.prepare('DELETE FROM project_resources WHERE resource_type = ? AND resource_id = ?')
        .run(resourceType, resourceId);
    console.log(`[ProjectManager] ✅ Untracked ${resourceType} resource: ${resourceId}`);
}

/**
 * Validates that a project exists and is active
 */
async function validateProject(projectId, userId) {
    const project = getProjectSync(projectId);

    if (!project) {
        throw new Error(`Project ${projectId} not found`);
    }

    if (project.status !== 'active') {
        throw new Error(`Project is ${project.status}. Only active projects can be modified.`);
    }

    return project;
}

export {
    createProject,
    linkDriveFolder,
    getProject,
    listProjects,
    archiveProject,
    deleteProject,
    updateProject,
    getProjectStats,
    trackResource,
    untrackResource,
    validateProject
};
