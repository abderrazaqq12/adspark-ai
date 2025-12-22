import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Asset type to subfolder mapping
const ASSET_TYPE_FOLDERS: Record<string, string> = {
  video: 'videos',
  image: 'images',
  audio: 'audio',
  script: 'scripts',
  voiceover: 'voiceovers',
  thumbnail: 'thumbnails',
  export: 'exports',
  scene: 'scenes',
};

interface UploadRequest {
  projectId: string;
  assetType: string;
  fileName: string;
  fileUrl?: string;      // URL to download and upload
  fileBase64?: string;   // Base64 encoded file data
  mimeType: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: UploadRequest = await req.json();
    const { projectId, assetType, fileName, fileUrl, fileBase64, mimeType, metadata } = body;

    console.log(`[upload-to-google-drive] User: ${user.id}, Project: ${projectId}, Type: ${assetType}, File: ${fileName}`);

    if (!projectId || !assetType || !fileName || (!fileUrl && !fileBase64)) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: projectId, assetType, fileName, and either fileUrl or fileBase64' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get project's Google Drive folder
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('google_drive_folder_id, google_drive_folder_link, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.error('[upload-to-google-drive] Project not found:', projectError);
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!project.google_drive_folder_id) {
      console.log('[upload-to-google-drive] Project has no Google Drive folder');
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Project has no Google Drive folder configured',
        skipped: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Google Drive access token
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      console.error('[upload-to-google-drive] Error fetching user settings:', settingsError);
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Failed to fetch user settings',
        skipped: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const preferences = userSettings?.preferences as Record<string, any> || {};
    const googleDriveAccessToken = preferences.google_drive_access_token;

    if (!googleDriveAccessToken) {
      console.log('[upload-to-google-drive] Google Drive not connected');
      return new Response(JSON.stringify({ 
        success: false,
        message: 'Google Drive not connected',
        skipped: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create the asset type subfolder
    const subfolderName = ASSET_TYPE_FOLDERS[assetType] || assetType;
    let targetFolderId = project.google_drive_folder_id;

    // Search for existing subfolder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${subfolderName}' and '${project.google_drive_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${googleDriveAccessToken}`,
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        targetFolderId = searchData.files[0].id;
        console.log(`[upload-to-google-drive] Using existing subfolder: ${subfolderName} (${targetFolderId})`);
      } else {
        // Create the subfolder
        const createFolderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleDriveAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: subfolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [project.google_drive_folder_id],
          }),
        });

        if (createFolderResponse.ok) {
          const folderData = await createFolderResponse.json();
          targetFolderId = folderData.id;
          console.log(`[upload-to-google-drive] Created subfolder: ${subfolderName} (${targetFolderId})`);
        } else {
          console.error('[upload-to-google-drive] Failed to create subfolder');
        }
      }
    }

    // Prepare file content
    let fileContent: Uint8Array;
    
    if (fileBase64) {
      // Decode base64
      fileContent = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    } else if (fileUrl) {
      // Download file from URL
      console.log(`[upload-to-google-drive] Downloading file from: ${fileUrl}`);
      const downloadResponse = await fetch(fileUrl);
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download file: ${downloadResponse.status}`);
      }
      fileContent = new Uint8Array(await downloadResponse.arrayBuffer());
    } else {
      throw new Error('No file content provided');
    }

    console.log(`[upload-to-google-drive] File size: ${fileContent.length} bytes`);

    // Upload file to Google Drive using multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
      description: metadata ? JSON.stringify(metadata) : undefined,
    };

    // Create multipart body
    const metadataString = JSON.stringify(fileMetadata);
    const multipartRequestBody = 
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      metadataString +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      btoa(String.fromCharCode(...fileContent)) +
      closeDelimiter;

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleDriveAccessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[upload-to-google-drive] Upload failed:', uploadResponse.status, errorText);
      
      if (uploadResponse.status === 401) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Google Drive token expired',
          message: 'Please reconnect your Google Drive in Settings',
          skipped: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadedFile = await uploadResponse.json();
    console.log(`[upload-to-google-drive] Upload successful: ${uploadedFile.id}`);

    // Log the upload to database
    await supabase.from('uploads').insert({
      user_id: user.id,
      project_id: projectId,
      file_url: uploadedFile.webViewLink || uploadedFile.webContentLink,
      file_name: fileName,
      file_type: assetType,
      file_size: fileContent.length,
      metadata: {
        google_drive_file_id: uploadedFile.id,
        google_drive_folder_id: targetFolderId,
        original_url: fileUrl,
        ...metadata
      }
    });

    return new Response(JSON.stringify({
      success: true,
      file_id: uploadedFile.id,
      file_name: uploadedFile.name,
      view_link: uploadedFile.webViewLink,
      download_link: uploadedFile.webContentLink,
      folder_id: targetFolderId,
      subfolder: subfolderName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[upload-to-google-drive] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
