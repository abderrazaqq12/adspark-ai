import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, provider, context, history, saasState } = await req.json();

    console.log(`[ai-assistant] User: ${user.id}, Provider: ${provider}`);

    let apiKey: string | undefined;
    let apiUrl: string;
    let model: string;

    if (provider === "lovable") {
      // Use Lovable AI (free, no key required)
      apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      model = "google/gemini-2.5-flash";
    } else if (provider === "openai") {
      // Get user's OpenAI key
      const { data: settings } = await supabase
        .from("user_settings")
        .select("api_keys")
        .eq("user_id", user.id)
        .maybeSingle();

      const keys = settings?.api_keys as Record<string, string> | null;
      apiKey = keys?.OPENAI_API_KEY || "";
      
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      apiUrl = "https://api.openai.com/v1/chat/completions";
      model = "gpt-4o-mini";
    } else if (provider === "gemini") {
      // Get user's Gemini key
      const { data: settings } = await supabase
        .from("user_settings")
        .select("api_keys")
        .eq("user_id", user.id)
        .maybeSingle();

      const keys = settings?.api_keys as Record<string, string> | null;
      apiKey = keys?.GEMINI_API_KEY || "";
      
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // For Gemini, use Lovable AI gateway with custom key
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      model = "google/gemini-2.5-flash";
    } else {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build enhanced context from SaaS state
    let stateContext = "";
    if (saasState) {
      stateContext = `\n\n--- CURRENT APP STATE ---`;
      if (saasState.productName) {
        stateContext += `\nProduct Name: ${saasState.productName}`;
      }
      if (saasState.stage !== undefined) {
        const stages = ["Product Info", "Video Script & Audio", "Scene Builder", "Video Generation", "Assembly & Edit", "Export"];
        stateContext += `\nCurrent Stage: ${stages[saasState.stage] || `Stage ${saasState.stage}`}`;
      }
      if (saasState.scripts && saasState.scripts.length > 0) {
        stateContext += `\n\nUser's Scripts (${saasState.scripts.length} total):`;
        saasState.scripts.slice(0, 3).forEach((script: string, i: number) => {
          stateContext += `\n\nScript ${i + 1}:\n"${script.slice(0, 500)}${script.length > 500 ? '...' : ''}"`;
        });
        if (saasState.scripts.length > 3) {
          stateContext += `\n\n...and ${saasState.scripts.length - 3} more scripts`;
        }
      }
      if (saasState.scenes && saasState.scenes.length > 0) {
        stateContext += `\n\nGenerated Scenes (${saasState.scenes.length} total):`;
        saasState.scenes.slice(0, 5).forEach((scene: any, i: number) => {
          stateContext += `\n- Scene ${i + 1}: ${scene.description || scene.title || scene.text || 'No description'}`;
        });
      }
      stateContext += `\n--- END APP STATE ---\n`;
    }

    const systemPrompt = `You are an expert AI assistant for a video ad creation SaaS platform. You have FULL ACCESS to the user's current project state and can provide specific, actionable advice.

## YOUR CAPABILITIES:
1. **Script Writing & Improvement**: Write, rewrite, and optimize video ad scripts for conversions
2. **Marketing Hooks**: Generate attention-grabbing hooks for TikTok, Instagram, YouTube
3. **Scene Analysis**: Review scene breakdowns and suggest improvements
4. **Engine Recommendations**: Advise on which AI video engines to use based on content type and budget
5. **Platform Optimization**: Tailor content for specific platforms and audiences
6. **Enhancement Suggestions**: Proactively suggest improvements to the user's current work

## CONTEXT:
${context || "video ad creation"}${stateContext}

## GUIDELINES:
1. Be SPECIFIC and ACTIONABLE - reference the user's actual content
2. When improving scripts, provide the COMPLETE improved version
3. For hooks, give 5+ options with platform recommendations
4. Format scripts/hooks in markdown code blocks for easy copying
5. Consider the target platform, audience, and emotional triggers
6. If you suggest script changes, wrap them in \`\`\`script\`\`\` blocks
7. Be direct and concise - users want quick, valuable advice
8. If the user asks to improve/edit something, do it immediately without asking for clarification

## RESPONSE FORMAT:
- Use markdown formatting for clarity
- Put any suggested scripts/hooks in code blocks
- Be conversational but efficient
- Provide reasoning briefly, then the solution`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    console.log(`[ai-assistant] Sending request to ${apiUrl} with model ${model}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI API error: ${response.status} - ${errorText.slice(0, 100)}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Extract any script/hook suggestions from the response
    let suggestion: string | null = null;
    const scriptMatch = assistantResponse.match(/```(?:script|hook)?\n?([\s\S]*?)```/);
    if (scriptMatch) {
      suggestion = scriptMatch[1].trim();
    }

    console.log(`[ai-assistant] Response generated successfully, suggestion extracted: ${!!suggestion}`);

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      suggestion,
      provider,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("AI Assistant error:", error);
    return new Response(JSON.stringify({ error: error.message || "AI Assistant failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
