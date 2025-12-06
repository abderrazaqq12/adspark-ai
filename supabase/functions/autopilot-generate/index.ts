import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCRIPT_TONES = [
  'engaging',
  'professional', 
  'casual',
  'urgent',
  'storytelling',
  'educational',
  'emotional',
  'humorous',
  'luxurious',
  'direct'
];

// Declare EdgeRuntime for Deno
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
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

    // Authenticate
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

    const { 
      productName, 
      productDescription, 
      productImageUrl,
      language = 'en',
      pricingTier = 'free',
      scriptsCount = 10,
      variationsPerScene = 10,
      voiceId = 'EXAVITQu4vr4xnSDxMaL' // Sarah
    } = await req.json();

    if (!productName) {
      return new Response(JSON.stringify({ error: 'Product name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[autopilot] Starting autopilot for: ${productName}`);

    // Step 1: Create Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: `Autopilot - ${productName}`,
        product_name: productName,
        language: language,
        status: 'processing',
        settings: {
          autopilot: true,
          productDescription,
          productImageUrl,
          pricingTier,
          scriptsCount,
          variationsPerScene,
          voiceId
        }
      })
      .select()
      .single();

    if (projectError) {
      console.error('[autopilot] Project creation error:', projectError);
      throw new Error('Failed to create project');
    }

    console.log(`[autopilot] Created project: ${project.id}`);

    // Step 2: Create Autopilot Job
    const totalVideos = scriptsCount * 5 * variationsPerScene; // ~5 scenes per script
    const { data: job, error: jobError } = await supabase
      .from('autopilot_jobs')
      .insert({
        user_id: user.id,
        project_id: project.id,
        product_name: productName,
        product_description: productDescription,
        product_image_url: productImageUrl,
        language,
        pricing_tier: pricingTier,
        scripts_count: scriptsCount,
        variations_per_scene: variationsPerScene,
        status: 'processing',
        total_videos: totalVideos,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('[autopilot] Job creation error:', jobError);
      throw new Error('Failed to create autopilot job');
    }

    console.log(`[autopilot] Created job: ${job.id}`);

    // Background processing
    const processAutopilot = async () => {
      try {
        // Step 3: Generate Scripts with different tones
        console.log('[autopilot] Generating scripts...');
        const scripts = [];
        const tonesToUse = SCRIPT_TONES.slice(0, scriptsCount);

        for (let i = 0; i < tonesToUse.length; i++) {
          const tone = tonesToUse[i];
          
          // Generate script using AI
          const scriptPrompt = `Create a compelling 30-60 second video ad script for:
Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
Tone: ${tone}
Language: ${language === 'ar' ? 'Arabic (Saudi dialect)' : language === 'en' ? 'English' : language}

Write ONLY the voice-over script text. No stage directions.`;

          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: 'You are an expert video ad scriptwriter. Create natural, engaging voice-over scripts.' },
                { role: 'user', content: scriptPrompt }
              ],
            }),
          });

          if (!aiResponse.ok) {
            console.error(`[autopilot] Script generation failed for tone: ${tone}`);
            continue;
          }

          const aiData = await aiResponse.json();
          const scriptText = aiData.choices?.[0]?.message?.content?.trim() || '';

          if (scriptText) {
            const { data: script, error: scriptError } = await supabase
              .from('scripts')
              .insert({
                project_id: project.id,
                raw_text: scriptText,
                language,
                tone,
                status: 'draft',
                metadata: { autopilot: true, toneIndex: i }
              })
              .select()
              .single();

            if (!scriptError && script) {
              scripts.push(script);
              console.log(`[autopilot] Generated script ${i + 1}/${tonesToUse.length} with tone: ${tone}`);
            }
          }

          // Update progress
          await supabase
            .from('autopilot_jobs')
            .update({
              progress: {
                scripts_generated: i + 1,
                voiceovers_generated: 0,
                scenes_broken_down: 0,
                videos_generated: 0,
                videos_assembled: 0
              }
            })
            .eq('id', job.id);
        }

        console.log(`[autopilot] Generated ${scripts.length} scripts`);

        // Step 4: Generate Voiceovers for each script
        console.log('[autopilot] Generating voiceovers...');
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          
          try {
            const voResponse = await fetch(`${supabaseUrl}/functions/v1/generate-voiceover`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: script.raw_text,
                voiceId,
                language,
                scriptId: script.id
              }),
            });

            if (voResponse.ok) {
              console.log(`[autopilot] Voiceover generated for script ${i + 1}`);
            }
          } catch (voError) {
            console.error(`[autopilot] Voiceover error for script ${i + 1}:`, voError);
          }

          await supabase
            .from('autopilot_jobs')
            .update({
              progress: {
                scripts_generated: scripts.length,
                voiceovers_generated: i + 1,
                scenes_broken_down: 0,
                videos_generated: 0,
                videos_assembled: 0
              }
            })
            .eq('id', job.id);
        }

        // Step 5: Breakdown scenes for each script
        console.log('[autopilot] Breaking down scenes...');
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          
          try {
            const breakdownResponse = await fetch(`${supabaseUrl}/functions/v1/breakdown-scenes`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                scriptId: script.id,
                scriptText: script.raw_text,
                language
              }),
            });

            if (breakdownResponse.ok) {
              console.log(`[autopilot] Scenes broken down for script ${i + 1}`);
            }
          } catch (breakdownError) {
            console.error(`[autopilot] Breakdown error for script ${i + 1}:`, breakdownError);
          }

          await supabase
            .from('autopilot_jobs')
            .update({
              progress: {
                scripts_generated: scripts.length,
                voiceovers_generated: scripts.length,
                scenes_broken_down: i + 1,
                videos_generated: 0,
                videos_assembled: 0
              }
            })
            .eq('id', job.id);
        }

        // Step 6: Batch generate videos
        console.log('[autopilot] Starting batch video generation...');
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          
          try {
            const batchResponse = await fetch(`${supabaseUrl}/functions/v1/batch-generate`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                scriptId: script.id,
                variationsPerScene,
                pricingTier
              }),
            });

            if (batchResponse.ok) {
              console.log(`[autopilot] Batch generation queued for script ${i + 1}`);
            }
          } catch (batchError) {
            console.error(`[autopilot] Batch error for script ${i + 1}:`, batchError);
          }
        }

        // Update job to waiting for generation
        await supabase
          .from('autopilot_jobs')
          .update({
            status: 'generating',
            progress: {
              scripts_generated: scripts.length,
              voiceovers_generated: scripts.length,
              scenes_broken_down: scripts.length,
              videos_generated: 0,
              videos_assembled: 0
            }
          })
          .eq('id', job.id);

        console.log('[autopilot] All tasks queued. Waiting for video generation...');

      } catch (processError) {
        console.error('[autopilot] Processing error:', processError);
        await supabase
          .from('autopilot_jobs')
          .update({
            status: 'failed',
            error_message: processError instanceof Error ? processError.message : 'Unknown error'
          })
          .eq('id', job.id);
      }
    };

    // Start background processing
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(processAutopilot());
    } else {
      // Fallback for environments without EdgeRuntime
      processAutopilot().catch(console.error);
    }

    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      projectId: project.id,
      message: 'Autopilot started! Track progress in the dashboard.',
      estimatedVideos: totalVideos
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[autopilot] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
