import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, isAIAvailable } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidExternalUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:") return { valid: false, error: "Only HTTPS allowed" };
    const hostname = url.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") return { valid: false, error: "Localhost not allowed" };
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 127) {
        return { valid: false, error: "Private IP not allowed" };
      }
    }
    return { valid: true };
  } catch { return { valid: false, error: "Invalid URL" }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, action, n8nBaseUrl, n8nApiKey, workflow } = await req.json();
    
    if (action === "deploy_workflow" && n8nBaseUrl && n8nApiKey && workflow) return await deployWorkflow(n8nBaseUrl, n8nApiKey, workflow);
    if (action === "list_workflows" && n8nBaseUrl && n8nApiKey) return await listWorkflows(n8nBaseUrl, n8nApiKey);
    if (action === "activate_workflow" && n8nBaseUrl && n8nApiKey && workflow?.id) return await activateWorkflow(n8nBaseUrl, n8nApiKey, workflow.id, workflow.active);

    if (!isAIAvailable()) throw new Error("No AI provider configured");

    let systemPrompt = action === "generate_workflow" 
      ? `Expert n8n workflow assistant. Generate valid n8n workflow JSON. Return ONLY JSON: { "name": "...", "nodes": [...], "connections": {}, "active": false }`
      : action === "suggest_nodes" 
      ? `n8n expert. Suggest nodes. Return JSON: { "suggestions": [{ "node_type": "...", "name": "...", "description": "..." }] }`
      : `n8n automation expert. Be concise and practical.`;

    const aiResponse = await callAI({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
      temperature: 0.7,
    });

    let parsedContent = aiResponse.content;
    try {
      const jsonMatch = aiResponse.content.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedContent = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {}

    return new Response(JSON.stringify({ success: true, content: parsedContent, provider: aiResponse.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("n8n-ai-helper error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

async function deployWorkflow(baseUrl: string, apiKey: string, workflow: any) {
  const cleanUrl = baseUrl.replace(/\/mcp-server\/http\/?$/, "").replace(/\/$/, "");
  const validation = isValidExternalUrl(cleanUrl);
  if (!validation.valid) return new Response(JSON.stringify({ success: false, error: validation.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  
  const response = await fetch(`${cleanUrl}/api/v1/workflows`, {
    method: "POST", headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" }, body: JSON.stringify(workflow)
  });
  if (!response.ok) return new Response(JSON.stringify({ success: false, error: `n8n error: ${response.status}` }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const result = await response.json();
  return new Response(JSON.stringify({ success: true, workflow: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function listWorkflows(baseUrl: string, apiKey: string) {
  const cleanUrl = baseUrl.replace(/\/mcp-server\/http\/?$/, "").replace(/\/$/, "");
  const validation = isValidExternalUrl(cleanUrl);
  if (!validation.valid) return new Response(JSON.stringify({ success: false, error: validation.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  
  const response = await fetch(`${cleanUrl}/api/v1/workflows`, { method: "GET", headers: { "X-N8N-API-KEY": apiKey } });
  if (!response.ok) return new Response(JSON.stringify({ success: false, error: `n8n error: ${response.status}` }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const result = await response.json();
  return new Response(JSON.stringify({ success: true, workflows: result.data || result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function activateWorkflow(baseUrl: string, apiKey: string, workflowId: string, active: boolean) {
  const cleanUrl = baseUrl.replace(/\/mcp-server\/http\/?$/, "").replace(/\/$/, "");
  const validation = isValidExternalUrl(cleanUrl);
  if (!validation.valid) return new Response(JSON.stringify({ success: false, error: validation.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  
  const response = await fetch(`${cleanUrl}/api/v1/workflows/${workflowId}`, {
    method: "PATCH", headers: { "X-N8N-API-KEY": apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ active })
  });
  if (!response.ok) return new Response(JSON.stringify({ success: false, error: `n8n error: ${response.status}` }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const result = await response.json();
  return new Response(JSON.stringify({ success: true, workflow: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
