import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type FileType = 'upload' | 'temp' | 'output' | 'final';
type Tool = 'studio' | 'replicator' | 'ai-editor' | 'ai-tools' | 'system';

interface RegisterFileRequest {
  fileName: string;
  filePath: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  fileType: FileType;
  tool: Tool;
  projectId?: string;
  jobId?: string;
}

interface RegisterFileBatch {
  files: RegisterFileRequest[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const body = await req.json();

    // Handle single file or batch
    const files: RegisterFileRequest[] = body.files || [body];

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validFileTypes: FileType[] = ['upload', 'temp', 'output', 'final'];
    const validTools: Tool[] = ['studio', 'replicator', 'ai-editor', 'ai-tools', 'system'];

    // Validate and prepare file records
    const fileRecords = files.map(file => {
      if (!file.fileName || !file.filePath || !file.fileType || !file.tool) {
        throw new Error('File must have fileName, filePath, fileType, and tool');
      }

      if (!validFileTypes.includes(file.fileType)) {
        throw new Error(`Invalid fileType: ${file.fileType}`);
      }

      if (!validTools.includes(file.tool)) {
        throw new Error(`Invalid tool: ${file.tool}`);
      }

      return {
        user_id: userId,
        project_id: file.projectId || null,
        job_id: file.jobId || null,
        file_name: file.fileName,
        file_path: file.filePath,
        file_url: file.fileUrl || null,
        file_size: file.fileSize || null,
        mime_type: file.mimeType || null,
        file_type: file.fileType,
        tool: file.tool,
        status: 'active'
      };
    });

    // Insert file records
    const { data, error: insertError } = await supabaseAdmin
      .from('file_assets')
      .insert(fileRecords)
      .select('id, file_name, file_type, expires_at');

    if (insertError) {
      console.error('[lifecycle-register-file] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to register files: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[lifecycle-register-file] Registered ${fileRecords.length} files for user ${userId}`);

    // Log the registration
    await supabaseAdmin
      .from('system_logs')
      .insert({
        user_id: userId,
        tool: 'system',
        stage: 'file-registration',
        severity: 'info',
        message: `Registered ${fileRecords.length} file(s)`,
        details: {
          files: data?.map(f => ({ id: f.id, name: f.file_name, type: f.file_type }))
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: fileRecords.length,
        files: data || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lifecycle-register-file] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
