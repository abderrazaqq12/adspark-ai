/**
 * FlowScale Google Drive Manager
 * 
 * Manages Google Drive folder lifecycle for projects:
 * - Folder creation (via Supabase Edge Function)
 * - Subfolder organization
 * - Archive/delete operations
 * 
 * Note: Actual Drive API calls go through Supabase Edge Functions
 * to avoid exposing OAuth tokens on VPS backend.
 */

import { supabase } from './supabase.js';

/**
 * Creates a Google Drive folder via Supabase Edge Function
 * @param {string} folderName - Name for the folder
 * @param {string} parentFolderId - Optional parent folder ID
 * @returns {Promise<object>} Created folder info
 */
async function createDriveFolder(folderName, parentFolderId = null) {
    try {
        const { data, error } = await supabase.functions.invoke('create-google-drive-folder', {
            body: {
                folderName,
                parentFolderId
            }
        });

        if (error) throw error;

        if (!data?.folder_id) {
            throw new Error('Drive folder creation returned no folder ID');
        }

        console.log(`[DriveManager] ✅ Created folder: ${folderName} (${data.folder_id})`);

        return {
            id: data.folder_id,
            name: data.folder_name || folderName,
            webViewLink: data.folder_link
        };
    } catch (error) {
        console.error(`[DriveManager] ❌ Failed to create folder: ${error.message}`);
        throw new Error(`Drive folder creation failed: ${error.message}`);
    }
}

/**
 * Creates standard subfolders for a project
 * @param {string} projectFolderId - Parent project folder ID
 * @returns {Promise<object>} Created subfolder IDs
 */
async function createProjectSubfolders(projectFolderId) {
    const subfolders = ['uploads', 'outputs', 'thumbnails', 'assets'];
    const created = {};

    for (const subfolder of subfolders) {
        try {
            const folder = await createDriveFolder(subfolder, projectFolderId);
            created[subfolder] = folder.id;
            console.log(`[DriveManager] ✅ Created subfolder: ${subfolder}`);
        } catch (error) {
            console.warn(`[DriveManager] ⚠️  Failed to create subfolder ${subfolder}: ${error.message}`);
            // Continue with other subfolders even if one fails
        }
    }

    return created;
}

/**
 * Gets or creates an Archive parent folder
 * @returns {Promise<string>} Archive folder ID
 */
async function getOrCreateArchiveFolder() {
    try {
        // Check if archive folder exists in user settings
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: settings } = await supabase
            .from('user_settings')
            .select('preferences')
            .eq('user_id', user.id)
            .single();

        const archiveFolderId = settings?.preferences?.archive_folder_id;

        if (archiveFolderId) {
            return archiveFolderId;
        }

        // Create new archive folder
        const archiveFolder = await createDriveFolder('FlowScale_Archive');

        // Store in user settings
        await supabase
            .from('user_settings')
            .update({
                preferences: {
                    ...settings?.preferences,
                    archive_folder_id: archiveFolder.id
                }
            })
            .eq('user_id', user.id);

        console.log(`[DriveManager] ✅ Created Archive folder: ${archiveFolder.id}`);
        return archiveFolder.id;

    } catch (error) {
        console.error(`[DriveManager] ❌ Failed to get/create archive folder: ${error.message}`);
        throw error;
    }
}

/**
 * Archives a Drive folder by moving it to Archive parent
 * Note: This requires Google Drive API permissions for moving files
 * Currently logged for manual action
 * 
 * @param {string} folderId - Folder ID to archive
 */
async function archiveDriveFolder(folderId) {
    try {
        // Get archive folder
        const archiveFolderId = await getOrCreateArchiveFolder();

        // TODO: Implement via Supabase Edge Function
        // For now, log the action needed
        console.log(`[DriveManager] ⚠️  Archive action needed for folder ${folderId}`);
        console.log(`[DriveManager] ⚠️  Move folder ${folderId} to Archive ${archiveFolderId}`);

        // This would be implemented as:
        // await supabase.functions.invoke('move-drive-folder', {
        //   body: { folderId, newParentId: archiveFolderId }
        // });

        return {
            success: true,
            message: 'Folder marked for archival',
            folderId,
            archiveFolderId
        };
    } catch (error) {
        console.error(`[DriveManager] ❌ Failed to archive folder: ${error.message}`);
        throw error;
    }
}

/**
 * Deletes a Drive folder
 * Note: This is a permanent action and requires user confirmation
 * 
 * @param {string} folderId - Folder ID to delete
 */
async function deleteDriveFolder(folderId) {
    try {
        // TODO: Implement via Supabase Edge Function
        // For now, log the action needed
        console.log(`[DriveManager] ⚠️  Delete action needed for folder ${folderId}`);
        console.log(`[DriveManager] ⚠️  Permanently delete folder ${folderId}`);

        // This would be implemented as:
        // await supabase.functions.invoke('delete-drive-folder', {
        //   body: { folderId }
        // });

        return {
            success: true,
            message: 'Folder marked for deletion',
            folderId
        };
    } catch (error) {
        console.error(`[DriveManager] ❌ Failed to delete folder: ${error.message}`);
        throw error;
    }
}

/**
 * Uploads a file to a project's Drive folder
 * @param {string} projectFolderId - Project's Drive folder ID
 * @param {string} subfolder - Subfolder name (uploads, outputs, etc.)
 * @param {string} fileName - File name
 * @param {Buffer|string} fileData - File data
 * @returns {Promise<object>} Upload result
 */
async function uploadToProjectFolder(projectFolderId, subfolder, fileName, fileData) {
    try {
        // This would use the existing upload-to-google-drive Edge Function
        const { data, error } = await supabase.functions.invoke('upload-to-google-drive', {
            body: {
                fileName,
                fileData,
                projectFolderId,
                subfolder
            }
        });

        if (error) throw error;

        console.log(`[DriveManager] ✅ Uploaded ${fileName} to ${subfolder}`);
        return data;
    } catch (error) {
        console.error(`[DriveManager] ❌ Upload failed: ${error.message}`);
        throw error;
    }
}

/**
 * Gets folder structure for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<object>} Folder structure
 */
async function getProjectFolderStructure(projectId) {
    try {
        const { data: sync, error } = await supabase
            .from('project_drive_sync')
            .select('folder_structure, drive_folder_id')
            .eq('project_id', projectId)
            .single();

        if (error) throw error;

        return {
            folderId: sync.drive_folder_id,
            structure: sync.folder_structure || {}
        };
    } catch (error) {
        console.error(`[DriveManager] ❌ Failed to get folder structure: ${error.message}`);
        return { folderId: null, structure: {} };
    }
}

/**
 * Updates folder structure cache
 * @param {string} projectId - Project ID
 * @param {object} structure - Folder structure object
 */
async function updateFolderStructure(projectId, structure) {
    try {
        const { error } = await supabase
            .from('project_drive_sync')
            .update({
                folder_structure: structure,
                last_sync_at: new Date().toISOString()
            })
            .eq('project_id', projectId);

        if (error) throw error;

        console.log(`[DriveManager] ✅ Updated folder structure for project ${projectId}`);
    } catch (error) {
        console.warn(`[DriveManager] ⚠️  Failed to update folder structure: ${error.message}`);
    }
}

export {
    createDriveFolder,
    createProjectSubfolders,
    getOrCreateArchiveFolder,
    archiveDriveFolder,
    deleteDriveFolder,
    uploadToProjectFolder,
    getProjectFolderStructure,
    updateFolderStructure
};
