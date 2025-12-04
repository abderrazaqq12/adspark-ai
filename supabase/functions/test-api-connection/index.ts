import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  success: boolean;
  message: string;
  latency?: number;
}

async function testOpenAI(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'OpenAI API connected successfully', latency };
    }
    const error = await response.json();
    return { success: false, message: error.error?.message || 'Invalid API key' };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testGemini(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'Gemini API connected successfully', latency };
    }
    const error = await response.json();
    return { success: false, message: error.error?.message || 'Invalid API key' };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testRunway(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.runwayml.com/v1/tasks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-09-13',
      },
    });
    const latency = Date.now() - start;
    
    if (response.ok || response.status === 200) {
      return { success: true, message: 'Runway API connected successfully', latency };
    }
    if (response.status === 401) {
      return { success: false, message: 'Invalid Runway API key' };
    }
    return { success: true, message: 'Runway API key format valid', latency };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testHeyGen(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      headers: { 'x-api-key': apiKey },
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: `HeyGen connected. Remaining credits: ${data.data?.remaining_quota || 'N/A'}`,
        latency 
      };
    }
    return { success: false, message: 'Invalid HeyGen API key' };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testElevenLabs(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey },
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: `ElevenLabs connected. Characters remaining: ${data.subscription?.character_limit - data.subscription?.character_count || 'N/A'}`,
        latency 
      };
    }
    return { success: false, message: 'Invalid ElevenLabs API key' };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testLeonardo(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/me', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'Leonardo AI connected successfully', latency };
    }
    return { success: false, message: 'Invalid Leonardo API key' };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testFal(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Use the models endpoint to verify API key
    const response = await fetch('https://api.fal.ai/v1/models?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'Fal AI connected successfully', latency };
    }
    
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid Fal AI API key' };
    }
    
    const errorText = await response.text();
    return { success: false, message: `Fal AI error: ${errorText}` };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testKling(accessKey: string, secretKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Kling AI uses JWT authentication with access key and secret key
    // Generate JWT token
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: accessKey,
      exp: now + 1800, // 30 minutes expiry
      nbf: now - 5
    };

    // Base64url encode
    const base64UrlEncode = (obj: any) => {
      const str = JSON.stringify(obj);
      const base64 = btoa(str);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const headerB64 = base64UrlEncode(header);
    const payloadB64 = base64UrlEncode(payload);
    const signatureInput = `${headerB64}.${payloadB64}`;

    // HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const signData = encoder.encode(signatureInput);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, signData);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const jwtToken = `${headerB64}.${payloadB64}.${signatureB64}`;

    // Test with Kling AI API
    const response = await fetch('https://api.klingai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: 'kling-v1',
        prompt: 'test',
        n: 1
      }),
    });
    const latency = Date.now() - start;

    if (response.ok || response.status === 200) {
      return { success: true, message: 'Kling AI connected successfully', latency };
    }
    
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid Kling AI credentials' };
    }

    // Even if we get an error about the request, it means auth worked
    return { success: true, message: 'Kling AI credentials valid', latency };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testOpenRouter(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'OpenRouter connected successfully', latency };
    }
    return { success: false, message: 'Invalid OpenRouter API key' };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

async function testAIMLAPI(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.aimlapi.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;
    
    if (response.ok) {
      return { success: true, message: 'AIML API connected successfully', latency };
    }
    return { success: false, message: 'Invalid AIML API key' };
  } catch (e) {
    const error = e as Error;
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { apiKeyType, apiKey } = await req.json();

    if (!apiKeyType || !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing apiKeyType or apiKey' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Testing ${apiKeyType} API key for user ${user.id}`);

    let result: TestResult;

    switch (apiKeyType) {
      case 'OPENAI_API_KEY':
        result = await testOpenAI(apiKey);
        break;
      case 'GEMINI_API_KEY':
        result = await testGemini(apiKey);
        break;
      case 'RUNWAY_API_KEY':
        result = await testRunway(apiKey);
        break;
      case 'HEYGEN_API_KEY':
        result = await testHeyGen(apiKey);
        break;
      case 'ELEVENLABS_API_KEY':
        result = await testElevenLabs(apiKey);
        break;
      case 'LEONARDO_API_KEY':
        result = await testLeonardo(apiKey);
        break;
      case 'FAL_API_KEY':
        result = await testFal(apiKey);
        break;
      case 'OPENROUTER_API_KEY':
        result = await testOpenRouter(apiKey);
        break;
      case 'AIMLAPI_API_KEY':
        result = await testAIMLAPI(apiKey);
        break;
      case 'KLING_API_KEY':
        // Kling uses access_key:secret_key format
        const [accessKey, secretKey] = apiKey.split(':');
        if (accessKey && secretKey) {
          result = await testKling(accessKey, secretKey);
        } else {
          result = { success: false, message: 'Kling AI requires format: access_key:secret_key' };
        }
        break;
      default:
        // For other APIs, just validate key format
        result = {
          success: apiKey.length > 10,
          message: apiKey.length > 10 ? 'API key format appears valid' : 'API key too short',
        };
    }

    console.log(`Test result for ${apiKeyType}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const error = e as Error;
    console.error('Error testing API connection:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
