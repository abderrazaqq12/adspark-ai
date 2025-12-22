import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================
// DETERMINISTIC BRAIN V2 ENGINE (BACKEND)
// DECISION ENGINES DO NOT FAIL - THEY DECIDE
// ============================================

// Approved strategy pool - the ONLY frameworks allowed in fallback
const APPROVED_FRAMEWORKS = [
  'AIDA',
  'PAS', 
  'Social Proof',
  'Problem → Solution',
  'Story-driven',
  'UGC Review'
] as const;

// Platform-specific framework preferences
const PLATFORM_FRAMEWORK_PREFERENCES: Record<string, string[]> = {
  'tiktok': ['UGC Review', 'Social Proof', 'Problem → Solution'],
  'reels': ['UGC Review', 'Social Proof', 'Problem → Solution'],
  'instagram': ['UGC Review', 'Social Proof', 'Story-driven'],
  'youtube': ['Story-driven', 'PAS', 'AIDA'],
  'meta': ['AIDA', 'PAS', 'Social Proof'],
  'snapchat': ['UGC Review', 'Problem → Solution', 'Social Proof'],
  'general': ['AIDA', 'PAS', 'Problem → Solution']
};

// Hook types by framework
const FRAMEWORK_HOOKS: Record<string, string[]> = {
  'AIDA': ['question', 'bold_claim', 'curiosity'],
  'PAS': ['pain_point', 'problem_statement', 'empathy'],
  'Social Proof': ['testimonial', 'statistic', 'authority'],
  'Problem → Solution': ['pain_point', 'before_after', 'transformation'],
  'Story-driven': ['personal_story', 'journey', 'narrative'],
  'UGC Review': ['authentic_reaction', 'unboxing', 'first_impression']
};

// Pacing by platform
const PLATFORM_PACING: Record<string, 'fast' | 'medium' | 'slow'> = {
  'tiktok': 'fast',
  'reels': 'fast',
  'instagram': 'medium',
  'youtube': 'medium',
  'meta': 'medium',
  'snapchat': 'fast',
  'general': 'medium'
};

interface BrainV2StrategyObject {
  framework: string;
  hook_type: string;
  pacing: 'fast' | 'medium' | 'slow';
  platform: string;
  goal: 'conversion';
  confidence_level: 'high' | 'medium' | 'fallback';
  decision_reason: string;
}

interface DeterministicInput {
  platform: string;
  funnel_stage: string;
  risk_tolerance: string;
  audience?: { language?: string; country?: string };
  segments?: any[];
}

// Seeded random for controlled, reproducible selection
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// PHASE 1: Analytical decision based on signals
function analyzeAndDecide(input: DeterministicInput): BrainV2StrategyObject | null {
  const { platform, funnel_stage, risk_tolerance, segments } = input;
  const normalizedPlatform = platform.toLowerCase();
  
  let confidence = 0;
  let framework: string | null = null;
  let reasons: string[] = [];

  // Signal 1: Platform-specific preference
  const platformPrefs = PLATFORM_FRAMEWORK_PREFERENCES[normalizedPlatform] || PLATFORM_FRAMEWORK_PREFERENCES['general'];
  if (platformPrefs.length > 0) {
    confidence += 30;
    framework = platformPrefs[0];
    reasons.push(`Platform ${platform} favors ${framework}`);
  }

  // Signal 2: Funnel stage optimization
  if (funnel_stage === 'cold' || funnel_stage === 'awareness') {
    framework = 'Social Proof';
    confidence += 20;
    reasons.push('Cold audience benefits from social proof');
  } else if (funnel_stage === 'warm' || funnel_stage === 'consideration') {
    framework = 'PAS';
    confidence += 20;
    reasons.push('Warm audience responds to pain-agitate-solution');
  } else if (funnel_stage === 'hot' || funnel_stage === 'decision') {
    framework = 'AIDA';
    confidence += 20;
    reasons.push('Hot audience ready for direct AIDA approach');
  }

  // Signal 3: Risk tolerance adjustment
  if (risk_tolerance === 'low') {
    if (!['AIDA', 'PAS'].includes(framework || '')) {
      framework = 'AIDA';
      reasons.push('Low risk: defaulting to proven AIDA framework');
    }
    confidence += 10;
  } else if (risk_tolerance === 'high') {
    framework = 'UGC Review';
    confidence += 10;
    reasons.push('High risk tolerance: using bold UGC approach');
  }

  // Signal 4: Segment analysis
  if (segments && segments.length > 0) {
    const hasHook = segments.some((s: any) => s.type === 'hook');
    const hasCTA = segments.some((s: any) => s.type === 'cta');
    if (hasHook && hasCTA) {
      confidence += 15;
      reasons.push('Video structure supports strategic framework');
    }
  }

  // Confidence threshold for analytical decision
  if (confidence >= 50 && framework) {
    const hooks = FRAMEWORK_HOOKS[framework] || ['question'];
    const pacing = PLATFORM_PACING[normalizedPlatform] || 'medium';
    
    return {
      framework,
      hook_type: hooks[0],
      pacing,
      platform: normalizedPlatform,
      goal: 'conversion',
      confidence_level: confidence >= 70 ? 'high' : 'medium',
      decision_reason: reasons.join('. ')
    };
  }

  return null; // Proceed to fallback
}

// PHASE 2: Deterministic fallback - ALWAYS returns a valid strategy
function fallbackDecision(input: DeterministicInput): BrainV2StrategyObject {
  const { platform } = input;
  const normalizedPlatform = platform.toLowerCase();
  
  // Get platform preferences or use approved pool
  const platformPrefs = PLATFORM_FRAMEWORK_PREFERENCES[normalizedPlatform];
  let selectedFramework: string;
  
  if (platformPrefs && platformPrefs.length > 0) {
    // Use first preference for platform
    selectedFramework = platformPrefs[0];
  } else {
    // Controlled random selection from approved pool
    const seed = Date.now() % 1000;
    const index = Math.floor(seededRandom(seed) * APPROVED_FRAMEWORKS.length);
    selectedFramework = APPROVED_FRAMEWORKS[index];
  }

  const hooks = FRAMEWORK_HOOKS[selectedFramework] || ['question'];
  const pacing = PLATFORM_PACING[normalizedPlatform] || 'medium';

  return {
    framework: selectedFramework,
    hook_type: hooks[0],
    pacing,
    platform: normalizedPlatform,
    goal: 'conversion',
    confidence_level: 'fallback',
    decision_reason: `Fallback applied due to insufficient analytical signals. Strategy selected from safe framework pool based on platform: ${platform}.`
  };
}

// MAIN BRAIN V2 DECISION FUNCTION - NEVER FAILS
function brainV2Decide(input: DeterministicInput): BrainV2StrategyObject {
  // Phase 1: Try analytical decision
  const analyticalResult = analyzeAndDecide(input);
  if (analyticalResult) {
    console.log('[Brain V2] Analytical decision:', analyticalResult.framework, '- Confidence:', analyticalResult.confidence_level);
    return analyticalResult;
  }

  // Phase 2: Guaranteed fallback
  const fallbackResult = fallbackDecision(input);
  console.log('[Brain V2] Fallback decision:', fallbackResult.framework);
  return fallbackResult;
}

// Generate deterministic variation ideas based on strategy
function generateDeterministicVariations(strategy: BrainV2StrategyObject, count: number, segments: any[]): any[] {
  const variations: any[] = [];
  const actions = ['emphasize_segment', 'reorder_segments', 'duplicate_segment', 'compress_segment'];
  const segmentTypes = ['hook', 'problem', 'solution', 'benefit', 'proof', 'cta'];
  
  for (let i = 0; i < count; i++) {
    const action = actions[i % actions.length];
    const targetType = segmentTypes[i % segmentTypes.length];
    
    variations.push({
      id: `var_${i}`,
      action,
      target_segment_type: targetType,
      intent: `Apply ${strategy.framework} framework with ${action}`,
      priority: i === 0 ? 'high' : (i < count / 2 ? 'medium' : 'low'),
      reasoning: `${strategy.framework} strategy recommends ${action} for ${targetType} segment. ${strategy.decision_reason}`,
      expected_impact: strategy.confidence_level === 'fallback' ? 'Moderate improvement expected' : 'High impact expected based on analysis',
      risk_level: strategy.confidence_level === 'fallback' ? 'low' : 'medium',
      brain_v2_strategy: strategy
    });
  }

  return variations;
}

// SSE Helper - sends a progress event
function createSSEMessage(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(createSSEMessage(event, data)));
      };

      try {
        const { 
          analysis, 
          target_framework, 
          variation_count = 3, 
          optimization_goal = 'conversion', 
          risk_tolerance = 'medium', 
          platform = 'general', 
          funnel_stage = 'cold',
          audience
        } = await req.json();

        const safeVariationCount = Math.max(1, Math.min(20, variation_count));

        sendEvent('progress', { 
          step: 1, 
          totalSteps: 5, 
          message: 'Initializing Brain V2 decision engine...', 
          variationCount: safeVariationCount,
          percentage: 10
        });

        // Get user ID from auth header (for API keys)
        let userId: string | null = null;
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
          } catch (e) {
            console.warn('[auth] Failed to get user:', e);
          }
        }

        // Validate analysis - but we don't fail, we use fallback
        const segments = analysis?.segments || [];
        const hasValidAnalysis = analysis && segments.length > 0;

        sendEvent('progress', { 
          step: 2, 
          totalSteps: 5, 
          message: hasValidAnalysis ? 'Analyzing video structure...' : 'Using default analysis...', 
          percentage: 25
        });

        // BRAIN V2 DETERMINISTIC DECISION (NEVER FAILS)
        const brainInput: DeterministicInput = {
          platform,
          funnel_stage,
          risk_tolerance,
          audience,
          segments
        };

        sendEvent('progress', { 
          step: 3, 
          totalSteps: 5, 
          message: 'Brain V2 making strategic decision...', 
          percentage: 40
        });

        const brainV2Strategy = brainV2Decide(brainInput);

        sendEvent('progress', { 
          step: 4, 
          totalSteps: 5, 
          message: `Strategy selected: ${brainV2Strategy.framework} (${brainV2Strategy.confidence_level})`, 
          percentage: 60
        });

        // Generate variations using deterministic logic
        const deterministicVariations = generateDeterministicVariations(
          brainV2Strategy, 
          safeVariationCount, 
          segments
        );

        // Try AI enhancement if available, but NEVER block on failure
        let blueprint: any = null;
        let aiEnhanced = false;

        // Fetch user API keys for potential AI enhancement
        const apiKeys: Record<string, string> = {};
        if (userId) {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);
            const providers = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY'];

            await Promise.all(providers.map(async (provider) => {
              const { data, error } = await supabase.rpc('get_user_api_key', {
                p_user_id: userId,
                p_provider: provider
              });
              if (!error && data) {
                apiKeys[provider] = data;
              }
            }));
          } catch (e) {
            console.warn('[creative-scale-strategize-stream] Failed to fetch user API keys:', e);
          }
        }

        // Try AI enhancement (optional, non-blocking)
        if (hasValidAnalysis && Object.keys(apiKeys).length > 0) {
          try {
            sendEvent('progress', { 
              step: 4, 
              totalSteps: 5, 
              message: 'Enhancing with AI insights...', 
              percentage: 70
            });

            const durationMs = analysis.metadata?.duration_ms || 0;
            const segmentsSummary = segments.map((s: any) =>
              `${s.type}(${s.start_ms}-${s.end_ms}ms)`
            ).join(', ');

            const systemPrompt = `You are enhancing a marketing strategy. The base strategy is: ${brainV2Strategy.framework}.
Generate ${safeVariationCount} refined variation ideas that build on this framework.
Output valid JSON only with variation_ideas array.`;

            const userPrompt = `Enhance strategy for:
- Framework: ${brainV2Strategy.framework}
- Platform: ${platform}
- Duration: ${durationMs}ms
- Segments: ${segmentsSummary}

Return JSON with variation_ideas[${safeVariationCount}] array.`;

            const aiResponse = await callAI({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.7,
              apiKeys,
            });

            const content = aiResponse.content || '';
            let jsonStr = content;
            if (content.includes('```json')) {
              jsonStr = content.split('```json')[1].split('```')[0].trim();
            } else if (content.includes('```')) {
              jsonStr = content.split('```')[1].split('```')[0].trim();
            }

            const aiBlueprint = JSON.parse(jsonStr);
            if (aiBlueprint.variation_ideas && aiBlueprint.variation_ideas.length > 0) {
              blueprint = aiBlueprint;
              aiEnhanced = true;
              console.log('[Brain V2] AI enhancement successful');
            }
          } catch (aiError) {
            // AI failed - silently continue with deterministic result
            console.log('[Brain V2] AI enhancement failed, using deterministic result:', aiError instanceof Error ? aiError.message : 'Unknown error');
          }
        }

        // Use deterministic result if AI didn't enhance
        if (!blueprint) {
          blueprint = {
            id: `strategy_${Date.now()}`,
            framework: brainV2Strategy.framework,
            framework_rationale: brainV2Strategy.decision_reason,
            detected_problems: [],
            objective: optimization_goal,
            strategic_insights: [brainV2Strategy.decision_reason],
            variation_ideas: deterministicVariations,
            recommended_duration_range: { min_ms: 20000, max_ms: 35000 },
            target_formats: [platform],
            brain_v2_decision: brainV2Strategy
          };
        } else {
          // Add Brain V2 decision to AI-enhanced blueprint
          blueprint.brain_v2_decision = brainV2Strategy;
        }

        // Ensure exact variation count
        while (blueprint.variation_ideas.length < safeVariationCount) {
          const idx = blueprint.variation_ideas.length;
          blueprint.variation_ideas.push({
            ...deterministicVariations[idx % deterministicVariations.length],
            id: `var_${idx}`
          });
        }

        sendEvent('progress', { 
          step: 5, 
          totalSteps: 5, 
          message: 'Strategy complete', 
          percentage: 100
        });

        // ALWAYS send complete - never error
        sendEvent('complete', {
          success: true,
          blueprint,
          meta: {
            source_analysis_id: analysis?.id,
            framework: brainV2Strategy.framework,
            confidence_level: brainV2Strategy.confidence_level,
            ai_enhanced: aiEnhanced,
            variations_count: blueprint.variation_ideas.length,
            optimization_goal,
            risk_tolerance,
            platform,
            funnel_stage,
            processed_at: new Date().toISOString()
          }
        });

        controller.close();

      } catch (err) {
        // EVEN ON ERROR: Return a valid fallback strategy
        console.error('[creative-scale-strategize-stream] Error:', err);
        
        const fallbackStrategy = brainV2Decide({
          platform: 'general',
          funnel_stage: 'cold',
          risk_tolerance: 'low',
          segments: []
        });

        const fallbackBlueprint = {
          id: `fallback_${Date.now()}`,
          framework: fallbackStrategy.framework,
          framework_rationale: fallbackStrategy.decision_reason,
          detected_problems: [],
          objective: 'conversion',
          strategic_insights: ['Fallback strategy due to processing error'],
          variation_ideas: generateDeterministicVariations(fallbackStrategy, 3, []),
          recommended_duration_range: { min_ms: 20000, max_ms: 35000 },
          target_formats: ['general'],
          brain_v2_decision: fallbackStrategy
        };

        controller.enqueue(encoder.encode(createSSEMessage('complete', {
          success: true, // Always success - we recovered
          blueprint: fallbackBlueprint,
          meta: {
            framework: fallbackStrategy.framework,
            confidence_level: 'fallback',
            ai_enhanced: false,
            variations_count: 3,
            recovered_from_error: true,
            processed_at: new Date().toISOString()
          }
        })));
        
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
});
