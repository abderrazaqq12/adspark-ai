import fetch from 'node-fetch';
import https from 'https';

const BASE_URL = 'https://72.62.26.4';
const ADMIN_PASSWORD = 'flowscale-admin-secure-2024';
const OPENROUTER_KEY = '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';

const agent = new https.Agent({
    rejectUnauthorized: false
});

async function saveOpenRouterKey() {
    try {
        console.log('1. Logging in to VPS...');
        const loginRes = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: ADMIN_PASSWORD
            }),
            agent
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('   ✓ Login successful');

        // 2. Save the OpenRouter API key
        console.log('2. Saving OpenRouter API key...');
        const saveRes = await fetch(`${BASE_URL}/api/api-keys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: 'OPENROUTER_API_KEY',
                encrypted_key: OPENROUTER_KEY,
                is_active: true
            }),
            agent
        });

        if (!saveRes.ok) {
            const error = await saveRes.text();
            throw new Error(`Save failed: ${saveRes.status} - ${error}`);
        }

        const saveData = await saveRes.json();
        console.log('   ✓ API key saved successfully');
        console.log('   Response:', JSON.stringify(saveData, null, 2));

        // 3. Verify the key was saved by fetching all keys
        console.log('3. Verifying API key was saved...');
        const fetchRes = await fetch(`${BASE_URL}/api/api-keys`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            agent
        });

        if (!fetchRes.ok) {
            throw new Error(`Fetch failed: ${fetchRes.status}`);
        }

        const fetchData = await fetchRes.json();
        const openRouterKey = fetchData.providers.find(p => p.provider === 'OPENROUTER_API_KEY');

        if (openRouterKey) {
            console.log('   ✓ OpenRouter key found in saved keys');
            console.log('   Status: Active =', openRouterKey.is_active);
        } else {
            console.log('   ⚠ Warning: OpenRouter key not found in list');
        }

        console.log('\n✅ SUCCESS!');
        console.log('Your OpenRouter API key has been saved to the VPS.');
        console.log('You can now use OpenRouter models in your application.');
        console.log('\nNote: API testing is not available in self-hosted mode,');
        console.log('but the key will be used directly when calling OpenRouter APIs.');

    } catch (err) {
        console.error('\n❌ FAILED:', err.message);
        process.exit(1);
    }
}

saveOpenRouterKey();
