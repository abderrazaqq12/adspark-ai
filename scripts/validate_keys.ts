
import fetch from 'node-fetch';

const keys = {
    EDENAI_API_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTNhMTU4YmItZDNkYy00OGUzLTg0NzAtZjVkNzcwN2FlMGZlIiwidHlwZSI6ImFwaV90b2tlbiJ9.rcdd3DwRqG90palZ9HUn6FbzKNNvLqS6b8LhmxpN7lE",
    APIFRAME_API_KEY: "d3824afc-930f-45a5-98aa-eb021064f0e9",
    FAL_API_KEY: "9e81272d-c449-4b78-bdbd-6f28def2d0e9:2ca19e7b9e1abaef5ebb388e3b4d32cc",
    AIMLAPI_API_KEY: "628b65674da64a4e9bf4cdadaede4fa6",
    OPENROUTER_API_KEY: "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",
    KIEAI_API_KEY: "e692f2d0176dd195275a0dbd14d519a5",
    HEYGEN_API_KEY: "ZjlhNGE3OTkzODAzNGFiNzkyYzY0MTIxOWRjNTFhMGUtMTczNDcxNDAwMQ==",
    ELEVENLABS_API_KEY: "sk_2c34e221a0a2872fb50c78352dc375d221f686741cc6920b"
};

async function testEdenAI(apiKey: string) {
    console.log(`Testing EdenAI...`);
    try {
        const response = await fetch('https://api.edenai.run/v2/info/provider', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (response.ok) console.log("✅ EdenAI: Success");
        else console.log(`❌ EdenAI: Failed (${response.status})`);
    } catch (e: any) { console.log(`❌ EdenAI: Error ${e.message}`); }
}

async function testAPIframe(apiKey: string) {
    console.log(`Testing APIframe...`);
    try {
        const response = await fetch('https://api.apiframe.pro/v1/user', {
            headers: { 'Authorization': apiKey },
        });
        if (response.ok) console.log("✅ APIframe: Success");
        else {
            // Fallback check as per logic
            if (response.status === 401 || response.status === 403) console.log(`❌ APIframe: Invalid Key (${response.status})`);
            else console.log(`✅ APIframe: Key Valid (Inferred from ${response.status})`);
        }
    } catch (e: any) { console.log(`❌ APIframe: Error ${e.message}`); }
}

// ... Add other testers as simple fetch calls ...
async function run() {
    await testEdenAI(keys.EDENAI_API_KEY);
    await testAPIframe(keys.APIFRAME_API_KEY);
    // Add logic for others if needed, but start with the problematic ones
}

run();
