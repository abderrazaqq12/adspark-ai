import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log(`[create-google-drive-folder] Authenticated user: ${user.id}`);

    const { folderName, parentFolderId } = await req.json();

    if (!folderName) {
      return new Response(JSON.stringify({ error: 'Folder name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's Google Drive settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch user settings',
        message: 'Please configure Google Drive in Settings first'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const preferences = userSettings?.preferences as Record<string, any> || {};
    const googleDriveAccessToken = preferences.google_drive_access_token;
    const googleDriveFolderUrl = preferences.google_drive_folder_url;

    if (!googleDriveAccessToken) {
      return new Response(JSON.stringify({ 
        error: 'Google Drive not connected',
        message: 'Please connect your Google Drive in Settings first'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract parent folder ID from URL if provided
    let targetParentId = parentFolderId;
    if (!targetParentId && googleDriveFolderUrl) {
      // Extract folder ID from Google Drive URL
      // URL formats:
      // https://drive.google.com/drive/folders/FOLDER_ID
      // https://drive.google.com/drive/u/0/folders/FOLDER_ID
      const match = googleDriveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        targetParentId = match[1];
      }
    }

    console.log(`[create-google-drive-folder] Creating folder: ${folderName} in parent: ${targetParentId || 'root'}`);

    // Create folder in Google Drive
    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (targetParentId) {
      metadata.parents = [targetParentId];
    }

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleDriveAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Google Drive API error:', createResponse.status, errorText);
      
      // Check if token expired
      if (createResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'Google Drive token expired',
          message: 'Please reconnect your Google Drive in Settings'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Failed to create Google Drive folder');
    }

    const folderData = await createResponse.json();
    const folderId = folderData.id;
    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;

    console.log(`[create-google-drive-folder] Folder created: ${folderId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      folder_id: folderId,
      folder_name: folderName,
      folder_link: folderLink,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in create-google-drive-folder:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
