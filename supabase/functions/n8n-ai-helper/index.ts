import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    if (action === "generate_workflow") {
      systemPrompt = `You are an expert n8n workflow automation assistant. You help users create n8n workflows by generating JSON node configurations.

When the user describes what they want to automate, you should:
1. Identify the nodes needed
2. Suggest the workflow structure
3. Provide the JSON configuration for each node

Format your response as a JSON object with:
{
  "workflow_name": "string",
  "description": "string",
  "nodes": [
    {
      "type": "n8n node type (e.g., n8n-nodes-base.webhook, n8n-nodes-base.httpRequest)",
      "name": "descriptive name",
      "parameters": { node-specific parameters },
      "position": [x, y]
    }
  ],
  "connections": { connection mapping }
}

Always include proper error handling nodes and suggest best practices.`;
    } else if (action === "suggest_nodes") {
      systemPrompt = `You are an n8n expert. Based on the user's description, suggest the most appropriate n8n nodes to use.

Respond with a JSON object:
{
  "suggestions": [
    {
      "node_type": "n8n-nodes-base.xxx",
      "name": "Human readable name",
      "description": "What this node does",
      "use_case": "Why use this node for the task"
    }
  ],
  "workflow_tip": "A helpful tip for the workflow"
}`;
    } else {
      systemPrompt = `You are an n8n automation expert. Help the user with their n8n workflow questions. Be concise and practical.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsedContent = content;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        parsedContent = JSON.parse(jsonStr);
      }
    } catch {
      // Keep as string if not valid JSON
    }

    console.log("AI response generated successfully for action:", action);

    return new Response(JSON.stringify({ 
      success: true, 
      content: parsedContent,
      raw: content 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("n8n-ai-helper error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
