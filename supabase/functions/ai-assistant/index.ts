import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIAvailable, getAvailableProviders } from "../_shared/ai-gateway.ts";

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

    console.log(`[ai-assistant] User: ${user.id}, Provider: ${provider || 'auto'}`);

    if (!isAIAvailable()) {
      return new Response(JSON.stringify({ error: "No AI provider configured. Please add Gemini or OpenAI API key." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build enhanced context from SaaS state
    let stateContext = "";
    if (saasState) {
      stateContext = `\n\n--- CURRENT APP STATE ---`;
      if (saasState.productName) stateContext += `\nProduct Name: ${saasState.productName}`;
      if (saasState.stage !== undefined) {
        const stages = ["Product Info", "Video Script & Audio", "Scene Builder", "Video Generation", "Assembly & Edit", "Export"];
        stateContext += `\nCurrent Stage: ${stages[saasState.stage] || `Stage ${saasState.stage}`}`;
      }
      if (saasState.scripts?.length > 0) {
        stateContext += `\n\nUser's Scripts (${saasState.scripts.length} total):`;
        saasState.scripts.slice(0, 3).forEach((script: string, i: number) => {
          stateContext += `\n\nScript ${i + 1}:\n"${script.slice(0, 500)}${script.length > 500 ? '...' : ''}"`;
        });
      }
      stateContext += `\n--- END APP STATE ---\n`;
    }

    const systemPrompt = `You are an expert AI assistant for a video ad creation SaaS platform.

## YOUR CAPABILITIES:
1. **Script Writing & Improvement**: Write, rewrite, and optimize video ad scripts
2. **Marketing Hooks**: Generate attention-grabbing hooks for TikTok, Instagram, YouTube
3. **Scene Analysis**: Review scene breakdowns and suggest improvements
4. **Engine Recommendations**: Advise on AI video engines based on content type and budget

## CONTEXT:
${context || "video ad creation"}${stateContext}

## GUIDELINES:
- Be SPECIFIC and ACTIONABLE
- For scripts, provide the COMPLETE improved version in code blocks
- Be direct and concise`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: "user" as const, content: message },
    ];

    const aiResponse = await callAI({ messages, temperature: 0.7, maxTokens: 2000 });

    const assistantResponse = aiResponse.content || "I couldn't generate a response.";
    let suggestion: string | null = null;
    const scriptMatch = assistantResponse.match(/```(?:script|hook)?\n?([\s\S]*?)```/);
    if (scriptMatch) suggestion = scriptMatch[1].trim();

    console.log(`[ai-assistant] Response generated via ${aiResponse.provider}`);

    return new Response(JSON.stringify({ 
      response: assistantResponse,
      suggestion,
      provider: aiResponse.provider,
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
