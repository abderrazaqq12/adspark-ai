import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrainRequest {
  action: 'select_engine' | 'optimize_prompt' | 'predict_quality' | 'learn' | 'get_recommendations';
  context: {
    project_id?: string;
    stage?: string;
    scene_type?: string;
    language?: string;
    market?: string;
    audience?: string;
    budget_tier?: string;
    product_type?: string;
  };
  input?: any;
}

interface EngineScore {
  engine_name: string;
  score: number;
  reasons: string[];
  estimated_cost: number;
  estimated_quality: number;
}

// Engine cost per second/operation
const ENGINE_COSTS: Record<string, number> = {
  'runway': 0.05,
  'sora': 0.08,
  'veo': 0.06,
  'pika': 0.03,
  'hailuo': 0.02,
  'kling': 0.04,
  'heygen': 0.10,
  'synthesia': 0.12,
  'nanobanana': 0.01,
  'elevenlabs': 0.02,
  'gemini': 0.001,
  'gpt': 0.002,
  'flux': 0.02,
  'leonardo': 0.015,
};

// Engine quality scores (0-100)
const ENGINE_QUALITY: Record<string, number> = {
  'runway': 90,
  'sora': 95,
  'veo': 92,
  'pika': 75,
  'hailuo': 70,
  'kling': 80,
  'heygen': 88,
  'synthesia': 85,
  'nanobanana': 65,
  'elevenlabs': 92,
  'gemini': 88,
  'gpt': 90,
  'flux': 85,
  'leonardo': 80,
};

// Scene type to engine mapping
const SCENE_ENGINE_MAP: Record<string, string[]> = {
  'talking_head': ['heygen', 'synthesia'],
  'product_closeup': ['veo', 'runway'],
  'gadget_demo': ['pika', 'kling'],
  'unboxing': ['runway', 'luma'],
  'cinematic': ['sora', 'veo'],
  'testimonial': ['heygen', 'synthesia'],
  'fast_social': ['pika', 'hailuo'],
  'complex_physics': ['kling', 'sora'],
  'lifestyle': ['runway', 'veo'],
  'before_after': ['pika', 'runway'],
  'hook': ['pika', 'hailuo'],
  'cta': ['heygen', 'pika'],
  'broll': ['runway', 'veo'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, context, input }: BrainRequest = await req.json();

    let result: any;

    switch (action) {
      case 'select_engine':
        result = await selectBestEngine(supabase, user.id, context, input);
        break;
      case 'optimize_prompt':
        result = await optimizePrompt(supabase, user.id, context, input);
        break;
      case 'predict_quality':
        result = await predictQuality(supabase, user.id, context, input);
        break;
      case 'learn':
        result = await recordLearning(supabase, user.id, context, input);
        break;
      case 'get_recommendations':
        result = await getRecommendations(supabase, user.id, context);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('AI Brain error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function selectBestEngine(
  supabase: any,
  userId: string,
  context: BrainRequest['context'],
  input: any
): Promise<{ engine: string; alternatives: EngineScore[]; reasoning: string }> {
  const { scene_type, budget_tier, language, market } = context;
  
  // Get user's historical preferences
  const { data: learnings } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('user_id', userId)
    .eq('learning_type', 'engine_preference')
    .order('confidence_score', { ascending: false })
    .limit(10);

  // Get available engines
  const { data: engines } = await supabase
    .from('ai_engines')
    .select('*')
    .eq('status', 'active');

  // Score each engine
  const scores: EngineScore[] = [];
  
  for (const engine of engines || []) {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Scene type match
    const preferredEngines = SCENE_ENGINE_MAP[scene_type || 'broll'] || [];
    if (preferredEngines.includes(engine.name.toLowerCase())) {
      score += 25;
      reasons.push(`Optimized for ${scene_type} scenes`);
    }

    // Budget tier consideration
    const cost = ENGINE_COSTS[engine.name.toLowerCase()] || 0.05;
    if (budget_tier === 'free' && engine.supports_free_tier) {
      score += 20;
      reasons.push('Free tier available');
    } else if (budget_tier === 'budget' && cost < 0.03) {
      score += 15;
      reasons.push('Cost-effective option');
    } else if (budget_tier === 'premium' && cost > 0.05) {
      score += 10;
      reasons.push('Premium quality');
    }

    // Quality score
    const quality = ENGINE_QUALITY[engine.name.toLowerCase()] || 70;
    score += quality * 0.2;
    
    // User preference from learnings
    const userPref = learnings?.find((l: any) => 
      l.insight?.preferred_engine?.toLowerCase() === engine.name.toLowerCase()
    );
    if (userPref) {
      score += userPref.confidence_score * 20;
      reasons.push('Based on your preferences');
    }

    // Language support
    if (language === 'ar' && ['heygen', 'elevenlabs'].includes(engine.name.toLowerCase())) {
      score += 10;
      reasons.push('Strong Arabic support');
    }

    scores.push({
      engine_name: engine.name,
      score,
      reasons,
      estimated_cost: cost * (input?.duration_sec || 5),
      estimated_quality: quality,
    });
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  
  return {
    engine: best?.engine_name || 'pika',
    alternatives: scores.slice(0, 5),
    reasoning: best?.reasons.join('. ') || 'Default selection',
  };
}

async function optimizePrompt(
  supabase: any,
  userId: string,
  context: BrainRequest['context'],
  input: { prompt: string; type: string }
): Promise<{ optimized_prompt: string; improvements: string[] }> {
  const { prompt, type } = input;
  const { language, market, audience } = context;

  // Get learned prompt patterns
  const { data: learnings } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('user_id', userId)
    .eq('learning_type', 'prompt_evolution')
    .order('confidence_score', { ascending: false })
    .limit(5);

  const improvements: string[] = [];
  let optimized = prompt;

  // Apply market-specific enhancements
  if (market === 'saudi' || language === 'ar') {
    if (!prompt.includes('trust') && !prompt.includes('ثقة')) {
      optimized += ' Emphasize trust and family values.';
      improvements.push('Added trust emphasis for Saudi market');
    }
  }

  // Apply audience-specific enhancements
  if (audience === 'female') {
    optimized += ' Focus on lifestyle benefits and emotional connection.';
    improvements.push('Added lifestyle focus for female audience');
  }

  // Apply type-specific enhancements
  if (type === 'hook') {
    optimized = `Create an attention-grabbing, fast-paced hook. ${optimized}`;
    improvements.push('Optimized for hook format');
  } else if (type === 'testimonial') {
    optimized = `Create authentic, relatable testimonial content. ${optimized}`;
    improvements.push('Optimized for testimonial format');
  }

  // Apply learned patterns
  for (const learning of learnings || []) {
    if (learning.insight?.pattern && learning.confidence_score > 0.7) {
      optimized += ` ${learning.insight.pattern}`;
      improvements.push(`Applied learned pattern: ${learning.insight.description || 'Custom enhancement'}`);
    }
  }

  return { optimized_prompt: optimized, improvements };
}

async function predictQuality(
  supabase: any,
  userId: string,
  context: BrainRequest['context'],
  input: { engine: string; prompt: string; scene_type: string }
): Promise<{ predicted_score: number; confidence: number; suggestions: string[] }> {
  const { engine, prompt, scene_type } = input;

  // Get historical quality data
  const { data: history } = await supabase
    .from('scenes')
    .select('quality_score, ai_quality_score, engine_name')
    .eq('engine_name', engine)
    .not('quality_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  // Calculate average quality
  const avgQuality = history?.length > 0
    ? history.reduce((sum: number, s: any) => sum + (s.quality_score || s.ai_quality_score || 70), 0) / history.length
    : ENGINE_QUALITY[engine.toLowerCase()] || 70;

  // Confidence based on data points
  const confidence = Math.min(0.95, 0.5 + (history?.length || 0) * 0.01);

  const suggestions: string[] = [];

  // Scene type suggestions
  const preferredEngines = SCENE_ENGINE_MAP[scene_type] || [];
  if (!preferredEngines.includes(engine.toLowerCase())) {
    suggestions.push(`Consider using ${preferredEngines[0] || 'runway'} for ${scene_type} scenes`);
  }

  // Prompt length suggestions
  if (prompt.length < 50) {
    suggestions.push('Add more detail to your prompt for better results');
  } else if (prompt.length > 500) {
    suggestions.push('Consider shortening your prompt for more focused output');
  }

  return {
    predicted_score: Math.round(avgQuality),
    confidence,
    suggestions,
  };
}

async function recordLearning(
  supabase: any,
  userId: string,
  context: BrainRequest['context'],
  input: { type: string; insight: any; confidence?: number }
): Promise<{ recorded: boolean }> {
  const { type, insight, confidence = 0.5 } = input;

  // Check if similar learning exists
  const { data: existing } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('user_id', userId)
    .eq('learning_type', type)
    .contains('context', context)
    .limit(1)
    .single();

  if (existing) {
    // Update existing learning
    await supabase
      .from('ai_learnings')
      .update({
        insight: { ...existing.insight, ...insight },
        confidence_score: Math.min(0.99, existing.confidence_score + 0.05),
        usage_count: existing.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new learning
    await supabase
      .from('ai_learnings')
      .insert({
        user_id: userId,
        learning_type: type,
        context,
        insight,
        confidence_score: confidence,
        usage_count: 1,
        last_used_at: new Date().toISOString(),
      });
  }

  return { recorded: true };
}

async function getRecommendations(
  supabase: any,
  userId: string,
  context: BrainRequest['context']
): Promise<{ recommendations: any[] }> {
  const { project_id, stage, market, language } = context;

  const recommendations: any[] = [];

  // Get project data
  if (project_id) {
    const { data: project } = await supabase
      .from('projects')
      .select('*, scripts(*), scenes(*)')
      .eq('id', project_id)
      .single();

    // Check for missing content
    if (!project?.product_name) {
      recommendations.push({
        type: 'content_gap',
        priority: 'high',
        message: 'Add product name to improve content generation',
        action: 'go_to_stage_0',
      });
    }

    // Check for scene quality issues
    const lowQualityScenes = project?.scenes?.filter((s: any) => 
      s.quality_score && s.quality_score < 60
    );
    if (lowQualityScenes?.length > 0) {
      recommendations.push({
        type: 'quality_issue',
        priority: 'medium',
        message: `${lowQualityScenes.length} scenes have low quality scores. Consider regenerating.`,
        action: 'regenerate_scenes',
        scene_ids: lowQualityScenes.map((s: any) => s.id),
      });
    }
  }

  // Get user learnings for smart defaults
  const { data: learnings } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false })
    .limit(10);

  if (learnings?.length > 0) {
    const topPreference = learnings[0];
    if (topPreference.learning_type === 'engine_preference') {
      recommendations.push({
        type: 'smart_default',
        priority: 'low',
        message: `Based on your history, ${topPreference.insight?.preferred_engine} works best for your content`,
        action: 'apply_default',
        value: topPreference.insight,
      });
    }
  }

  // Market-specific recommendations
  if (market === 'saudi' || language === 'ar') {
    recommendations.push({
      type: 'market_tip',
      priority: 'low',
      message: 'For Saudi market, consider using emotional storytelling and trust-building CTAs',
      action: 'learn_more',
    });
  }

  return { recommendations };
}
