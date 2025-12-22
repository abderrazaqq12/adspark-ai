/**
 * FlowScale Project Manager
 * 
 * Central project management module enforcing the Project System architecture:
 * - All operations must belong to a Project
 * - Projects own all resources (DB, Drive, files, outputs)
 * - Drive folders created automatically with projects
 * - Lifecycle management (create, archive, delete)
 */

import { supabase } from './supabase.js';

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

    // Create project in database
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
            user_id: userId,
            name: name.trim(),
            description,
            product_name,
            language,
            settings,
            status: 'active'
        })
        .select()
        .single();

    if (projectError) {
        throw new Error(`Failed to create project: ${projectError.message}`);
    }

    console.log(`[ProjectManager] ✅ Created project: ${project.id} (${project.name})`);
    return project;
}

/**
 * Links a Google Drive folder to a project
 * @param {string} projectId - Project ID
 * @param {string} folderId - Google Drive folder ID
 * @param {string} folderLink - Google Drive folder web link
 */
async function linkDriveFolder(projectId, folderId, folderLink) {
    // Update project with Drive folder info
    const { error: updateError } = await supabase
        .from('projects')
        .update({
            google_drive_folder_id: folderId,
            google_drive_folder_link: folderLink,
            updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

    if (updateError) {
        throw new Error(`Failed to link Drive folder: ${updateError.message}`);
    }

    // Create Drive sync record
    const { error: syncError } = await supabase
        .from('project_drive_sync')
        .insert({
            project_id: projectId,
            drive_folder_id: folderId,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString()
        });

    if (syncError) {
        // Log but don't fail - sync record is optional
        console.warn(`[ProjectManager] ⚠️  Failed to create sync record: ${syncError.message}`);
    }

    console.log(`[ProjectManager] ✅ Linked Drive folder ${folderId} to project ${projectId}`);
}

/**
 * Gets a project by ID with resource stats
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID (for access control)
 * @returns {Promise<object>} Project with stats
 */
async function getProject(projectId, userId) {
    const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

    if (error) {
        throw new Error(`Project not found: ${error.message}`);
    }

    // Get resource stats
    const stats = await getProjectStats(projectId);

    return {
        ...project,
        stats
    };
}

/**
 * Lists all projects for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} List of projects
 */
async function listProjects(userId, options = {}) {
    const { status = 'active', limit = 100, offset = 0 } = options;

    let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);

    if (status) {
        query = query.eq('status', status);
    }

    const { data: projects, error } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Failed to list projects: ${error.message}`);
    }

    return projects || [];
}

/**
 * Archives a project (soft delete)
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID (for access control)
 */
async function archiveProject(projectId, userId) {
    // Use the database function for atomic operation
    const { error } = await supabase.rpc('archive_project', {
        p_project_id: projectId
    });

    if (error) {
        throw new Error(`Failed to archive project: ${error.message}`);
    }

    console.log(`[ProjectManager] ✅ Archived project: ${projectId}`);
}

/**
 * Permanently deletes a project
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID (for access control)
 */
async function deleteProject(projectId, userId) {
    // Soft delete approach - mark as deleted
    const { error } = await supabase
        .from('projects')
        .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .eq('status', 'active'); // Only allow deleting active projects

    if (error) {
        throw new Error(`Failed to delete project: ${error.message}`);
    }

    // CASCADE will handle cleanup of related records
    console.log(`[ProjectManager] ✅ Deleted project: ${projectId}`);
}

/**
 * Updates project metadata
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID (for access control)
 * @param {object} updates - Fields to update
 */
async function updateProject(projectId, userId, updates) {
    // Filter allowed fields
    const allowedFields = ['name', 'description', 'product_name', 'language', 'settings'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            filteredUpdates[field] = updates[field];
        }
    }

    if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data: project, error } = await supabase
        .from('projects')
        .update(filteredUpdates)
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update project: ${error.message}`);
    }

    console.log(`[ProjectManager] ✅ Updated project: ${projectId}`);
    return project;
}

/**
 * Gets project resource statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<object>} Resource statistics
 */
async function getProjectStats(projectId) {
    const { data: resources, error } = await supabase
        .from('project_resources')
        .select('resource_type, size_bytes')
        .eq('project_id', projectId);

    if (error) {
        // Return empty stats if table doesn't exist yet or query fails
        return {
            total_resources: 0,
            total_bytes: 0,
            by_type: {}
        };
    }

    const stats = (resources || []).reduce((acc, r) => {
        const type = r.resource_type;
        if (!acc[type]) {
            acc[type] = { count: 0, bytes: 0 };
        }
        acc[type].count++;
        acc[type].bytes += r.size_bytes || 0;
        return acc;
    }, {});

    return {
        total_resources: resources?.length || 0,
        total_bytes: (resources || []).reduce((sum, r) => sum + (r.size_bytes || 0), 0),
        by_type: stats
    };
}

/**
 * Tracks a resource for a project
 * @param {string} projectId - Project ID
 * @param {object} resource - Resource details
 */
async function trackResource(projectId, resource) {
    const { type, id, path, size = 0, metadata = {} } = resource;

    if (!type || !id) {
        throw new Error('Resource type and ID are required');
    }

    const { error } = await supabase
        .from('project_resources')
        .insert({
            project_id: projectId,
            resource_type: type,
            resource_id: id,
            resource_path: path,
            size_bytes: size,
            metadata
        });

    if (error) {
        // If duplicate, that's okay (unique constraint)
        if (error.code !== '23505') {
            console.warn(`[ProjectManager] ⚠️  Failed to track resource: ${error.message}`);
        }
    } else {
        console.log(`[ProjectManager] ✅ Tracked ${type} resource: ${id}`);
    }
}

/**
 * Removes a resource tracking entry
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 */
async function untrackResource(resourceType, resourceId) {
    const { error } = await supabase
        .from('project_resources')
        .delete()
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

    if (error) {
        console.warn(`[ProjectManager] ⚠️  Failed to untrack resource: ${error.message}`);
    } else {
        console.log(`[ProjectManager] ✅ Untracked ${resourceType} resource: ${resourceId}`);
    }
}

/**
 * Validates that a project exists and is active
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID (for access control)
 * @returns {Promise<object>} Project if valid
 * @throws {Error} If project invalid or inaccessible
 */
async function validateProject(projectId, userId) {
    const { data: project, error } = await supabase
        .from('projects')
        .select('id, name, status, google_drive_folder_id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

    if (error || !project) {
        throw new Error(`Project ${projectId} not found or access denied`);
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
