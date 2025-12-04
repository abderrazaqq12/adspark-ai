import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface N8NPayload {
  action: string
  data: Record<string, unknown>
  userId?: string
}

// Simple UUID validation
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Validate string with max length
function validateString(value: unknown, maxLength: number = 10000): string | null {
  if (typeof value !== 'string') return null;
  if (value.length > maxLength) return null;
  return value;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // SECURITY: Validate webhook secret
    const expectedSecret = Deno.env.get('N8N_WEBHOOK_SECRET')
    const providedSecret = req.headers.get('x-webhook-secret')
    
    if (!expectedSecret) {
      console.error('[n8n-webhook] N8N_WEBHOOK_SECRET not configured - rejecting request')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured. Please set N8N_WEBHOOK_SECRET.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (providedSecret !== expectedSecret) {
      console.warn('[n8n-webhook] Invalid or missing webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: N8NPayload = await req.json()
    const { action, data, userId } = payload

    // SECURITY: Validate required fields
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SECURITY: Validate userId if provided (must be valid UUID)
    if (userId && !isValidUUID(userId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: userId must be a valid UUID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[n8n-webhook] Received action: ${action}`, { hasUserId: !!userId })

    let result: unknown = null

    switch (action) {
      // ============ PROJECT OPERATIONS ============
      case 'create_project': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { name, product_name, language, settings } = data as {
          name: string
          product_name?: string
          language?: string
          settings?: Record<string, unknown>
        }
        
        const validatedName = validateString(name, 255)
        if (!validatedName) {
          return new Response(
            JSON.stringify({ error: 'Invalid project name' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const { data: project, error } = await supabase
          .from('projects')
          .insert({
            name: validatedName,
            product_name: validateString(product_name, 255),
            language: validateString(language, 10) || 'en',
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
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { limit = 10 } = data as { limit?: number }
        const safeLimit = Math.min(Math.max(1, limit), 100)
        
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(safeLimit)
        
        if (error) throw error
        result = projects
        break
      }

      case 'update_project': {
        // SECURITY: Require userId for ownership verification
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { projectId, updates } = data as { projectId: string; updates: Record<string, unknown> }
        
        if (!projectId || !isValidUUID(projectId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid projectId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Sanitize updates - only allow specific fields
        const allowedFields = ['name', 'product_name', 'language', 'settings', 'status']
        const sanitizedUpdates: Record<string, unknown> = {}
        for (const key of allowedFields) {
          if (key in updates) {
            sanitizedUpdates[key] = updates[key]
          }
        }
        
        // SECURITY: Verify ownership by including user_id in query
        const { data: project, error } = await supabase
          .from('projects')
          .update(sanitizedUpdates)
          .eq('id', projectId)
          .eq('user_id', userId)  // Verify ownership
          .select()
          .single()
        
        if (error) throw error
        if (!project) {
          return new Response(
            JSON.stringify({ error: 'Project not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = project
        break
      }

      case 'delete_project': {
        // SECURITY: Require userId for ownership verification
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { projectId } = data as { projectId: string }
        
        if (!projectId || !isValidUUID(projectId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid projectId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // SECURITY: Verify ownership by including user_id in query
        const { data: deleted, error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', userId)  // Verify ownership
          .select()
          .single()
        
        if (error) throw error
        if (!deleted) {
          return new Response(
            JSON.stringify({ error: 'Project not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = { success: true, projectId }
        break
      }

      // ============ SCRIPT OPERATIONS ============
      case 'create_script': {
        // SECURITY: Require userId for ownership verification
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { projectId, raw_text, language, tone, style, hooks } = data as {
          projectId: string
          raw_text: string
          language?: string
          tone?: string
          style?: string
          hooks?: string[]
        }
        
        if (!projectId || !isValidUUID(projectId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid projectId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // SECURITY: Verify user owns the project before creating script
        const { data: projectCheck, error: projectCheckError } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('user_id', userId)
          .single()
        
        if (projectCheckError || !projectCheck) {
          return new Response(
            JSON.stringify({ error: 'Project not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const validatedText = validateString(raw_text, 50000)
        if (!validatedText) {
          return new Response(
            JSON.stringify({ error: 'Invalid raw_text' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const { data: script, error } = await supabase
          .from('scripts')
          .insert({
            project_id: projectId,
            raw_text: validatedText,
            language: validateString(language, 10) || 'en',
            tone: validateString(tone, 50),
            style: validateString(style, 50),
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
        // SECURITY: Require userId for ownership verification
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { projectId } = data as { projectId: string }
        
        if (!projectId || !isValidUUID(projectId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid projectId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // SECURITY: Verify user owns the project before fetching scripts
        const { data: projectCheck, error: projectCheckError } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('user_id', userId)
          .single()
        
        if (projectCheckError || !projectCheck) {
          return new Response(
            JSON.stringify({ error: 'Project not found or access denied' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
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
        
        if (!scriptId || !isValidUUID(scriptId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid scriptId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
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
        
        if (!scriptId || !isValidUUID(scriptId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid scriptId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        if (engine_id && !isValidUUID(engine_id)) {
          return new Response(
            JSON.stringify({ error: 'Invalid engine_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const { data: scene, error } = await supabase
          .from('scenes')
          .insert({
            script_id: scriptId,
            text: validateString(text, 10000) || '',
            visual_prompt: validateString(visual_prompt, 10000),
            scene_type: validateString(scene_type, 50),
            index: Math.max(0, Math.min(index, 1000)),
            duration_sec: duration_sec ? Math.max(0, Math.min(duration_sec, 300)) : null,
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
        // SECURITY: Require userId for ownership verification
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { sceneId, updates } = data as { sceneId: string; updates: Record<string, unknown> }
        
        if (!sceneId || !isValidUUID(sceneId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid sceneId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // SECURITY: Verify user owns the scene through script->project chain
        const { data: sceneCheck, error: sceneCheckError } = await supabase
          .from('scenes')
          .select('id, scripts!inner(project_id, projects!inner(user_id))')
          .eq('id', sceneId)
          .single()
        
        if (sceneCheckError || !sceneCheck) {
          return new Response(
            JSON.stringify({ error: 'Scene not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Type assertion for nested query result
        const sceneData = sceneCheck as unknown as { 
          id: string; 
          scripts: { project_id: string; projects: { user_id: string } } 
        }
        
        if (sceneData.scripts?.projects?.user_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Sanitize updates - only allow specific fields
        const allowedFields = ['text', 'visual_prompt', 'scene_type', 'index', 'duration_sec', 'engine_id', 'status']
        const sanitizedUpdates: Record<string, unknown> = {}
        for (const key of allowedFields) {
          if (key in updates) {
            sanitizedUpdates[key] = updates[key]
          }
        }
        
        const { data: scene, error } = await supabase
          .from('scenes')
          .update(sanitizedUpdates)
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
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
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
        
        if (type && validateString(type, 50)) query = query.eq('type', type)
        if (status && validateString(status, 20)) query = query.eq('status', status)
        
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
        
        if (scriptId && !isValidUUID(scriptId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid scriptId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        let query = supabase
          .from('generation_queue')
          .select('*, scenes(*), ai_engines(*)')
        
        if (scriptId) {
          query = query.eq('scenes.script_id', scriptId)
        }
        if (userId) {
          query = query.eq('user_id', userId)
        }
        
        const { data: queue, error } = await query.order('created_at', { ascending: false }).limit(100)
        
        if (error) throw error
        result = queue
        break
      }

      // ============ VIDEO OUTPUTS ============
      case 'get_video_outputs': {
        const { projectId, scriptId } = data as { projectId?: string; scriptId?: string }
        
        if (projectId && !isValidUUID(projectId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid projectId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        if (scriptId && !isValidUUID(scriptId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid scriptId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        let query = supabase.from('video_outputs').select('*')
        
        if (projectId) query = query.eq('project_id', projectId)
        if (scriptId) query = query.eq('script_id', scriptId)
        
        const { data: outputs, error } = await query.order('created_at', { ascending: false }).limit(100)
        
        if (error) throw error
        result = outputs
        break
      }

      // ============ PROMPT TEMPLATES ============
      case 'get_templates': {
        const { category } = data as { category?: string }
        let query = supabase.from('prompt_templates').select('*')
        
        if (category && validateString(category, 50)) query = query.eq('category', category)
        if (userId) query = query.or(`user_id.eq.${userId},is_default.eq.true`)
        
        const { data: templates, error } = await query.order('created_at', { ascending: false }).limit(100)
        
        if (error) throw error
        result = templates
        break
      }

      case 'create_template': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { name, template_text, category, language, variables } = data as {
          name: string
          template_text: string
          category?: string
          language?: string
          variables?: Record<string, unknown>
        }
        
        const validatedName = validateString(name, 255)
        const validatedText = validateString(template_text, 50000)
        
        if (!validatedName || !validatedText) {
          return new Response(
            JSON.stringify({ error: 'Invalid name or template_text' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        const { data: template, error } = await supabase
          .from('prompt_templates')
          .insert({
            name: validatedName,
            template_text: validatedText,
            category: validateString(category, 50),
            language: validateString(language, 10),
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
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
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
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const { updates } = data as { updates: Record<string, unknown> }
        
        // Sanitize updates - only allow specific fields
        const allowedFields = ['default_language', 'default_voice', 'use_free_tier_only', 'preferences']
        const sanitizedUpdates: Record<string, unknown> = {}
        for (const key of allowedFields) {
          if (key in updates) {
            sanitizedUpdates[key] = updates[key]
          }
        }
        
        const { data: settings, error } = await supabase
          .from('user_settings')
          .update(sanitizedUpdates)
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
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for this action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        // Execute the full video generation pipeline
        const { projectName, product_name, scriptText, language, variationsPerScene } = data as {
          projectName: string
          product_name: string
          scriptText: string
          language?: string
          variationsPerScene?: number
        }

        const validatedProjectName = validateString(projectName, 255)
        const validatedScriptText = validateString(scriptText, 50000)
        
        if (!validatedProjectName || !validatedScriptText) {
          return new Response(
            JSON.stringify({ error: 'Invalid projectName or scriptText' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Step 1: Create project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: validatedProjectName,
            product_name: validateString(product_name, 255),
            language: validateString(language, 10) || 'en',
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
            raw_text: validatedScriptText,
            language: validateString(language, 10) || 'en',
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
        const safeVariations = Math.min(Math.max(1, variationsPerScene || 3), 10)
        const batchResponse = await fetch(`${supabaseUrl}/functions/v1/batch-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            scriptId: script.id,
            variationsPerScene: safeVariations,
            randomEngines: true,
            userId
          })
        })
        const batchResult = await batchResponse.json()

        result = {
          project,
          script,
          scenesCreated: breakdownResult.scenes?.length || 0,
          batchQueued: batchResult.queued || 0,
          message: 'Pipeline started successfully'
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    console.log(`[n8n-webhook] Action ${action} completed successfully`)

    return new Response(
      JSON.stringify({ success: true, action, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[n8n-webhook] Error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
