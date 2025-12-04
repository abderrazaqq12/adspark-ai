import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface N8NPayload {
  action: string
  data: Record<string, unknown>
  userId?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: N8NPayload = await req.json()
    const { action, data, userId } = payload

    console.log(`[n8n-webhook] Received action: ${action}`, { data, userId })

    let result: unknown = null

    switch (action) {
      // ============ PROJECT OPERATIONS ============
      case 'create_project': {
        const { name, product_name, language, settings } = data as {
          name: string
          product_name?: string
          language?: string
          settings?: Record<string, unknown>
        }
        const { data: project, error } = await supabase
          .from('projects')
          .insert({
            name,
            product_name,
            language: language || 'en',
            settings,
            user_id: userId,
            status: 'draft'
          })
          .select()
          .single()
        
        if (error) throw error
        result = project
        break
      }

      case 'get_projects': {
        const { limit = 10 } = data as { limit?: number }
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        if (error) throw error
        result = projects
        break
      }

      case 'update_project': {
        const { projectId, updates } = data as { projectId: string; updates: Record<string, unknown> }
        const { data: project, error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', projectId)
          .select()
          .single()
        
        if (error) throw error
        result = project
        break
      }

      case 'delete_project': {
        const { projectId } = data as { projectId: string }
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
        
        if (error) throw error
        result = { success: true, projectId }
        break
      }

      // ============ SCRIPT OPERATIONS ============
      case 'create_script': {
        const { projectId, raw_text, language, tone, style, hooks } = data as {
          projectId: string
          raw_text: string
          language?: string
          tone?: string
          style?: string
          hooks?: string[]
        }
        const { data: script, error } = await supabase
          .from('scripts')
          .insert({
            project_id: projectId,
            raw_text,
            language: language || 'en',
            tone,
            style,
            hooks,
            status: 'draft'
          })
          .select()
          .single()
        
        if (error) throw error
        result = script
        break
      }

      case 'get_scripts': {
        const { projectId } = data as { projectId: string }
        const { data: scripts, error } = await supabase
          .from('scripts')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        result = scripts
        break
      }

      case 'generate_scripts': {
        // Call the generate-scripts edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-scripts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      // ============ SCENE OPERATIONS ============
      case 'get_scenes': {
        const { scriptId } = data as { scriptId: string }
        const { data: scenes, error } = await supabase
          .from('scenes')
          .select('*, ai_engines(*)')
          .eq('script_id', scriptId)
          .order('index', { ascending: true })
        
        if (error) throw error
        result = scenes
        break
      }

      case 'create_scene': {
        const { scriptId, text, visual_prompt, scene_type, index, duration_sec, engine_id } = data as {
          scriptId: string
          text: string
          visual_prompt?: string
          scene_type?: string
          index: number
          duration_sec?: number
          engine_id?: string
        }
        const { data: scene, error } = await supabase
          .from('scenes')
          .insert({
            script_id: scriptId,
            text,
            visual_prompt,
            scene_type,
            index,
            duration_sec,
            engine_id,
            status: 'draft'
          })
          .select()
          .single()
        
        if (error) throw error
        result = scene
        break
      }

      case 'update_scene': {
        const { sceneId, updates } = data as { sceneId: string; updates: Record<string, unknown> }
        const { data: scene, error } = await supabase
          .from('scenes')
          .update(updates)
          .eq('id', sceneId)
          .select()
          .single()
        
        if (error) throw error
        result = scene
        break
      }

      case 'breakdown_scenes': {
        // Call the breakdown-scenes edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/breakdown-scenes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      // ============ VIDEO GENERATION ============
      case 'generate_scene_video': {
        // Call the generate-scene-video edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-scene-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      case 'batch_generate': {
        // Call the batch-generate edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/batch-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ ...data, userId })
        })
        result = await response.json()
        break
      }

      case 'process_queue': {
        // Call the process-queue edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/process-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      // ============ VOICEOVER ============
      case 'generate_voiceover': {
        // Call the generate-voiceover edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-voiceover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      // ============ VIDEO ASSEMBLY ============
      case 'assemble_video': {
        // Call the assemble-video edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/assemble-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      // ============ ENGINE OPERATIONS ============
      case 'get_engines': {
        const { type, status = 'active' } = data as { type?: string; status?: string }
        let query = supabase.from('ai_engines').select('*')
        
        if (type) query = query.eq('type', type)
        if (status) query = query.eq('status', status)
        
        const { data: engines, error } = await query.order('priority_score', { ascending: false })
        
        if (error) throw error
        result = engines
        break
      }

      case 'route_engine': {
        // Call the route-engine edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/route-engine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      // ============ QUEUE STATUS ============
      case 'get_queue_status': {
        const { scriptId } = data as { scriptId?: string }
        let query = supabase
          .from('generation_queue')
          .select('*, scenes(*), ai_engines(*)')
        
        if (scriptId) {
          query = query.eq('scenes.script_id', scriptId)
        }
        if (userId) {
          query = query.eq('user_id', userId)
        }
        
        const { data: queue, error } = await query.order('created_at', { ascending: false })
        
        if (error) throw error
        result = queue
        break
      }

      // ============ VIDEO OUTPUTS ============
      case 'get_video_outputs': {
        const { projectId, scriptId } = data as { projectId?: string; scriptId?: string }
        let query = supabase.from('video_outputs').select('*')
        
        if (projectId) query = query.eq('project_id', projectId)
        if (scriptId) query = query.eq('script_id', scriptId)
        
        const { data: outputs, error } = await query.order('created_at', { ascending: false })
        
        if (error) throw error
        result = outputs
        break
      }

      // ============ PROMPT TEMPLATES ============
      case 'get_templates': {
        const { category } = data as { category?: string }
        let query = supabase.from('prompt_templates').select('*')
        
        if (category) query = query.eq('category', category)
        if (userId) query = query.or(`user_id.eq.${userId},is_default.eq.true`)
        
        const { data: templates, error } = await query.order('created_at', { ascending: false })
        
        if (error) throw error
        result = templates
        break
      }

      case 'create_template': {
        const { name, template_text, category, language, variables } = data as {
          name: string
          template_text: string
          category?: string
          language?: string
          variables?: Record<string, unknown>
        }
        const { data: template, error } = await supabase
          .from('prompt_templates')
          .insert({
            name,
            template_text,
            category,
            language,
            variables,
            user_id: userId,
            is_default: false
          })
          .select()
          .single()
        
        if (error) throw error
        result = template
        break
      }

      // ============ USER SETTINGS ============
      case 'get_user_settings': {
        const { data: settings, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (error) throw error
        result = settings
        break
      }

      case 'update_user_settings': {
        const { updates } = data as { updates: Record<string, unknown> }
        const { data: settings, error } = await supabase
          .from('user_settings')
          .update(updates)
          .eq('user_id', userId)
          .select()
          .single()
        
        if (error) throw error
        result = settings
        break
      }

      // ============ ANALYZE SCRIPT ============
      case 'analyze_script': {
        // Call the analyze-script edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze-script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(data)
        })
        result = await response.json()
        break
      }

      // ============ FULL PIPELINE ============
      case 'full_pipeline': {
        // Execute the full video generation pipeline
        const { projectName, product_name, scriptText, language, variationsPerScene } = data as {
          projectName: string
          product_name: string
          scriptText: string
          language?: string
          variationsPerScene?: number
        }

        // Step 1: Create project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: projectName,
            product_name,
            language: language || 'en',
            user_id: userId,
            status: 'processing'
          })
          .select()
          .single()
        
        if (projectError) throw projectError

        // Step 2: Create script
        const { data: script, error: scriptError } = await supabase
          .from('scripts')
          .insert({
            project_id: project.id,
            raw_text: scriptText,
            language: language || 'en',
            status: 'analyzing'
          })
          .select()
          .single()
        
        if (scriptError) throw scriptError

        // Step 3: Breakdown scenes
        const breakdownResponse = await fetch(`${supabaseUrl}/functions/v1/breakdown-scenes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ scriptId: script.id })
        })
        const breakdownResult = await breakdownResponse.json()

        // Step 4: Start batch generation
        const batchResponse = await fetch(`${supabaseUrl}/functions/v1/batch-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            scriptId: script.id,
            variationsPerScene: variationsPerScene || 3,
            randomEngines: true,
            userId
          })
        })
        const batchResult = await batchResponse.json()

        result = {
          project,
          script,
          breakdown: breakdownResult,
          batch: batchResult,
          message: 'Full pipeline initiated. Check queue status for progress.'
        }
        break
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    console.log(`[n8n-webhook] Action ${action} completed successfully`)

    return new Response(
      JSON.stringify({ success: true, action, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[n8n-webhook] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
