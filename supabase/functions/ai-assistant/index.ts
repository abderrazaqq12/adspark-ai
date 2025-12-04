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

    const { message, provider, context, history } = await req.json();

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

    const systemPrompt = `You are an expert AI assistant specialized in creating high-converting video advertisements. Your expertise includes:

- Writing compelling ad scripts (UGC, testimonials, product showcases)
- Creating attention-grabbing hooks that stop scrollers
- Understanding e-commerce marketing psychology
- Optimizing for different platforms (TikTok, Instagram, YouTube, Facebook)
- Multi-language marketing (English, Arabic, Spanish, French)

Context: The user is working on ${context || "video ad creation"}.

Guidelines:
1. Be concise and actionable
2. Focus on conversion-driving copy
3. Suggest specific hooks, CTAs, and emotional triggers
4. When asked for scripts, format them with clear scene breakdowns
5. Consider the target audience and platform

If the user asks for a script or hook suggestion that can be directly used, include it in your response with clear markers.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Extract any script/hook suggestions from the response
    let suggestion: string | null = null;
    const scriptMatch = assistantResponse.match(/```(?:script|hook)?\n?([\s\S]*?)```/);
    if (scriptMatch) {
      suggestion = scriptMatch[1].trim();
    }

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
