import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface WebhookPayload {
  engine: 'runway' | 'pika' | 'heygen' | 'hailuo' | 'luma' | 'kling' | 'veo'
  job_id: string
  status: 'completed' | 'failed' | 'processing'
  video_url?: string
  thumbnail_url?: string
  error_message?: string
  metadata?: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify webhook secret (optional but recommended)
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')
    
    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.warn('[ai-engine-webhook] Invalid webhook secret')
      // Don't reject - many engines don't support custom headers
    }

    const payload: WebhookPayload = await req.json()
    console.log(`[ai-engine-webhook] Received callback from ${payload.engine}:`, payload)

    const { engine, job_id, status, video_url, thumbnail_url, error_message, metadata } = payload

    // Find the queue item by external_job_id
    const { data: queueItem, error: findError } = await supabase
      .from('generation_queue')
      .select('*, scenes(*)')
      .eq('external_job_id', job_id)
      .single()

    if (findError || !queueItem) {
      console.error(`[ai-engine-webhook] Queue item not found for job_id: ${job_id}`)
      
      // Try to find by callback_data
      const { data: altQueueItem } = await supabase
        .from('generation_queue')
        .select('*, scenes(*)')
        .contains('callback_data', { job_id })
        .single()

      if (!altQueueItem) {
        return new Response(
          JSON.stringify({ success: false, error: 'Queue item not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const item = queueItem

    if (status === 'completed' && video_url) {
      // Update scene with video URL
      const { error: sceneError } = await supabase
        .from('scenes')
        .update({
          video_url,
          thumbnail_url,
          status: 'completed',
          metadata: {
            ...((item.scenes?.metadata as Record<string, unknown>) || {}),
            engine_response: metadata,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', item.scene_id)

      if (sceneError) {
        console.error('[ai-engine-webhook] Error updating scene:', sceneError)
      }

      // Update queue item
      const { error: queueError } = await supabase
        .from('generation_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          callback_data: {
            ...((item.callback_data as Record<string, unknown>) || {}),
            response: { video_url, thumbnail_url, metadata }
          }
        })
        .eq('id', item.id)

      if (queueError) {
        console.error('[ai-engine-webhook] Error updating queue item:', queueError)
      }

      console.log(`[ai-engine-webhook] Successfully updated scene ${item.scene_id} with video from ${engine}`)

      // Trigger n8n webhook if configured
      const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
      if (n8nWebhookUrl) {
        try {
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'scene_completed',
              scene_id: item.scene_id,
              video_url,
              engine,
              job_id
            })
          })
        } catch (n8nError) {
          console.error('[ai-engine-webhook] Failed to notify n8n:', n8nError)
        }
      }

    } else if (status === 'failed') {
      // Update queue item as failed
      const { error: queueError } = await supabase
        .from('generation_queue')
        .update({
          status: 'failed',
          error_message: error_message || `${engine} generation failed`,
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id)

      // Update scene status
      await supabase
        .from('scenes')
        .update({ status: 'failed' })
        .eq('id', item.scene_id)

      if (queueError) {
        console.error('[ai-engine-webhook] Error updating failed queue item:', queueError)
      }

      console.log(`[ai-engine-webhook] Marked scene ${item.scene_id} as failed: ${error_message}`)

    } else if (status === 'processing') {
      // Update to show processing started
      await supabase
        .from('generation_queue')
        .update({
          callback_data: {
            ...((item.callback_data as Record<string, unknown>) || {}),
            last_status_update: new Date().toISOString(),
            engine_status: 'processing'
          }
        })
        .eq('id', item.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Webhook processed for ${engine}`,
        scene_id: item.scene_id,
        status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ai-engine-webhook] Error:', error)
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
