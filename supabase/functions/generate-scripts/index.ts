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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
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

    console.log(`[generate-scripts] Authenticated user: ${user.id}`);

    const { projectId, templateId, variables, count = 10, language = 'en' } = await req.json();

    // Get template
    let template: any;
    if (templateId) {
      const { data } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      template = data;
    } else {
      // Get default template for language
      const { data } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('is_default', true)
        .eq('language', language)
        .limit(1)
        .maybeSingle();
      template = data;
    }

    if (!template) {
      return new Response(JSON.stringify({ error: 'No template found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Replace variables in template
    let prompt = template.template_text;
    for (const [key, value] of Object.entries(variables || {})) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
    }

    // Generate scripts using AI
    const systemPrompt = `You are an expert video ad scriptwriter. Generate ${count} unique variations of the script based on the template. Each variation should be different in hooks, angles, and phrasing while maintaining the core message. Output as JSON array of strings.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${count} script variations based on this template:\n\n${prompt}\n\nVariables provided: ${JSON.stringify(variables)}\n\nOutput format: JSON array of ${count} script strings. Each script should be 40-80 words suitable for a 30-60 second video ad.` }
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate scripts');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse AI response - handle both JSON and text formats
    let generatedScripts: string[] = [];
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        generatedScripts = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by numbered items
        generatedScripts = content.split(/\d+\.\s+/).filter((s: string) => s.trim().length > 20);
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
      generatedScripts = [content]; // Use raw content as single script
    }

    // Save scripts to database
    const scriptsToInsert = generatedScripts.slice(0, count).map((text: string, index: number) => ({
      project_id: projectId,
      language,
      raw_text: text.trim(),
      tone: variables?.brand_tone || 'professional',
      style: variables?.style || 'ugc',
      status: 'draft',
      metadata: { variation: index + 1, template_id: templateId }
    }));

    const { data: insertedScripts, error: insertError } = await supabase
      .from('scripts')
      .insert(scriptsToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      scripts: insertedScripts,
      count: insertedScripts?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-scripts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
