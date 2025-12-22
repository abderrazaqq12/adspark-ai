import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

interface LogEntry {
  tool: string;
  stage?: string;
  severity: LogSeverity;
  message: string;
  projectId?: string;
  jobId?: string;
  details?: Record<string, unknown>;
}

interface LogBatch {
  entries: LogEntry[];
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

    // Handle single log or batch
    const entries: LogEntry[] = body.entries || [body];

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No log entries provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and prepare log records
    const logRecords = entries.map(entry => {
      if (!entry.tool || !entry.severity || !entry.message) {
        throw new Error('Log entry must have tool, severity, and message');
      }

      const validSeverities: LogSeverity[] = ['debug', 'info', 'warning', 'error', 'critical'];
      if (!validSeverities.includes(entry.severity)) {
        throw new Error(`Invalid severity: ${entry.severity}`);
      }

      return {
        user_id: userId,
        project_id: entry.projectId || null,
        job_id: entry.jobId || null,
        tool: entry.tool,
        stage: entry.stage || null,
        severity: entry.severity,
        message: entry.message,
        details: entry.details || null
      };
    });

    // Insert logs
    const { data, error: insertError } = await supabaseAdmin
      .from('system_logs')
      .insert(logRecords)
      .select('id, created_at');

    if (insertError) {
      console.error('[lifecycle-log] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to insert logs: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[lifecycle-log] Inserted ${logRecords.length} log entries for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: logRecords.length,
        ids: data?.map(d => d.id) || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lifecycle-log] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
