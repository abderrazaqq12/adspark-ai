import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SSRF Protection: Validate URLs to prevent internal network scanning
function isValidExternalUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Require HTTPS only
    if (url.protocol !== "https:") {
      return { valid: false, error: "Only HTTPS URLs are allowed" };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost and loopback addresses
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return { valid: false, error: "Localhost URLs are not allowed" };
    }
    
    // Block internal IP ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c] = ipv4Match.map(Number);
      
      // 10.0.0.0/8 - Private network
      if (a === 10) {
        return { valid: false, error: "Private IP addresses (10.x.x.x) are not allowed" };
      }
      
      // 172.16.0.0/12 - Private network
      if (a === 172 && b >= 16 && b <= 31) {
        return { valid: false, error: "Private IP addresses (172.16-31.x.x) are not allowed" };
      }
      
      // 192.168.0.0/16 - Private network
      if (a === 192 && b === 168) {
        return { valid: false, error: "Private IP addresses (192.168.x.x) are not allowed" };
      }
      
      // 169.254.0.0/16 - Link-local / Cloud metadata
      if (a === 169 && b === 254) {
        return { valid: false, error: "Link-local addresses (169.254.x.x) are not allowed" };
      }
      
      // 127.0.0.0/8 - Loopback
      if (a === 127) {
        return { valid: false, error: "Loopback addresses are not allowed" };
      }
      
      // 0.0.0.0/8 - Current network
      if (a === 0) {
        return { valid: false, error: "Invalid IP address" };
      }
    }
    
    // Block common internal hostnames
    const blockedPatterns = [
      /^internal\./i,
      /^intranet\./i,
      /^private\./i,
      /\.local$/i,
      /\.internal$/i,
      /\.corp$/i,
      /^metadata\./i,
    ];
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: "Internal hostnames are not allowed" };
      }
    }
    
    // Block AWS/GCP/Azure metadata endpoints
    if (hostname === "metadata.google.internal" || 
        hostname === "metadata.goog" ||
        hostname.includes("169.254.169.254")) {
      return { valid: false, error: "Cloud metadata endpoints are not allowed" };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, action, n8nBaseUrl, n8nApiKey, workflow } = await req.json();
    
    // Handle workflow deployment to n8n
    if (action === "deploy_workflow" && n8nBaseUrl && n8nApiKey && workflow) {
      return await deployWorkflow(n8nBaseUrl, n8nApiKey, workflow);
    }

    // Handle listing workflows from n8n
    if (action === "list_workflows" && n8nBaseUrl && n8nApiKey) {
      return await listWorkflows(n8nBaseUrl, n8nApiKey);
    }

    // Handle activating a workflow
    if (action === "activate_workflow" && n8nBaseUrl && n8nApiKey && workflow?.id) {
      return await activateWorkflow(n8nBaseUrl, n8nApiKey, workflow.id, workflow.active);
    }

    // AI-powered workflow generation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    if (action === "generate_workflow") {
      systemPrompt = `You are an expert n8n workflow automation assistant. Generate complete, deployable n8n workflow JSON configurations.

When the user describes what they want to automate, you should generate a valid n8n workflow JSON that can be directly imported.

IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "name": "Workflow Name",
  "nodes": [
    {
      "parameters": {},
      "id": "unique-uuid",
      "name": "Node Name",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    }
  ],
  "connections": {},
  "active": false,
  "settings": {
    "executionOrder": "v1"
  }
}

Common node types:
- n8n-nodes-base.webhook (trigger)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.set (set values)
- n8n-nodes-base.if (conditions)
- n8n-nodes-base.code (JavaScript)
- n8n-nodes-base.slack (Slack messages)
- n8n-nodes-base.googleSheets (Google Sheets)
- n8n-nodes-base.telegram (Telegram)

Always include proper node positioning (increment x by 200 for each node in sequence).
Always generate unique UUIDs for node IDs.`;
    } else if (action === "suggest_nodes") {
      systemPrompt = `You are an n8n expert. Based on the user's description, suggest the most appropriate n8n nodes to use.

Respond with ONLY valid JSON:
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

async function deployWorkflow(baseUrl: string, apiKey: string, workflow: any) {
  try {
    // Clean the base URL
    const cleanUrl = baseUrl.replace(/\/mcp-server\/http\/?$/, "").replace(/\/$/, "");
    
    // Validate URL to prevent SSRF
    const validation = isValidExternalUrl(cleanUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Invalid n8n URL: ${validation.error}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const apiUrl = `${cleanUrl}/api/v1/workflows`;
    
    console.log("Deploying workflow to:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflow),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("n8n API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `n8n API error: ${response.status} - ${errorText}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("Workflow deployed successfully:", result.id);

    return new Response(JSON.stringify({ 
      success: true, 
      workflow: result,
      message: `Workflow "${result.name}" deployed successfully!`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Deploy workflow error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to deploy workflow" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function listWorkflows(baseUrl: string, apiKey: string) {
  try {
    const cleanUrl = baseUrl.replace(/\/mcp-server\/http\/?$/, "").replace(/\/$/, "");
    
    // Validate URL to prevent SSRF
    const validation = isValidExternalUrl(cleanUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Invalid n8n URL: ${validation.error}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const apiUrl = `${cleanUrl}/api/v1/workflows`;
    
    console.log("Listing workflows from:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("n8n API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `n8n API error: ${response.status}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("Listed workflows:", result.data?.length || 0);

    return new Response(JSON.stringify({ 
      success: true, 
      workflows: result.data || result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("List workflows error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to list workflows" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function activateWorkflow(baseUrl: string, apiKey: string, workflowId: string, active: boolean) {
  try {
    const cleanUrl = baseUrl.replace(/\/mcp-server\/http\/?$/, "").replace(/\/$/, "");
    
    // Validate URL to prevent SSRF
    const validation = isValidExternalUrl(cleanUrl);
    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Invalid n8n URL: ${validation.error}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const apiUrl = `${cleanUrl}/api/v1/workflows/${workflowId}`;
    
    console.log("Activating workflow:", workflowId, "active:", active);

    const response = await fetch(apiUrl, {
      method: "PATCH",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ active }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("n8n API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `n8n API error: ${response.status}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("Workflow activation updated:", result.id, "active:", result.active);

    return new Response(JSON.stringify({ 
      success: true, 
      workflow: result,
      message: `Workflow ${active ? 'activated' : 'deactivated'} successfully!`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Activate workflow error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to update workflow" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
