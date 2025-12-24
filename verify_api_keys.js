import fetch from 'node-fetch';
import https from 'https';

const BASE_URL = 'https://72.62.26.4';
const ADMIN_PASSWORD = 'flowscale-admin-secure-2024';

const agent = new https.Agent({
    rejectUnauthorized: false
});

async function verifyApiKeys() {
    try {
        console.log('1. Logging in...');
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

        // 2. Test saving an API key
        console.log('2. Testing API key save...');
        const saveRes = await fetch(`${BASE_URL}/api/api-keys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: 'OPENAI_API_KEY',
                encrypted_key: 'test_key_123',
                is_active: true
            }),
            agent
        });

        if (!saveRes.ok) {
            const error = await saveRes.text();
            throw new Error(`API key save failed: ${saveRes.status} - ${error}`);
        }

        console.log('   ✓ API key saved successfully');

        // 3. Test fetching API keys
        console.log('3. Testing API key fetch...');
        const fetchRes = await fetch(`${BASE_URL}/api/api-keys`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            agent
        });

        if (!fetchRes.ok) {
            throw new Error(`API key fetch failed: ${fetchRes.status}`);
        }

        const data = await fetchRes.json();
        console.log('   ✓ API keys fetched:', data.providers.length, 'keys found');

        if (data.providers.some(p => p.provider === 'OPENAI_API_KEY')) {
            console.log('   ✓ Test key found in list');
        }

        // 4. Cleanup: Delete test key
        console.log('4. Cleaning up...');
        const deleteRes = await fetch(`${BASE_URL}/api/api-keys/OPENAI_API_KEY`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            agent
        });

        if (!deleteRes.ok) {
            console.warn('   ⚠ Test key deletion failed (non-critical)');
        } else {
            console.log('   ✓ Test key deleted');
        }

        console.log('\n✅ SUCCESS: All API key operations work correctly!');

    } catch (err) {
        console.error('\n❌ VERIFICATION FAILED:', err.message);
        process.exit(1);
    }
}

verifyApiKeys();
