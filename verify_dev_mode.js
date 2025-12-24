import fetch from 'node-fetch';
import https from 'https';

const BASE_URL = 'https://72.62.26.4';

const agent = new https.Agent({
    rejectUnauthorized: false
});

async function testDevMode() {
    try {
        console.log('=== Testing DEV_MODE Implementation ===\n');

        // Test 1: Health check (should work without auth)
        console.log('1. Testing /api/health without authentication...');
        const healthRes = await fetch(`${BASE_URL}/api/health`, { agent });
        if (healthRes.ok) {
            console.log('   ✅ Health check works without auth\n');
        }

        // Test 2: Profile access (should work in DEV_MODE)
        console.log('2. Testing /api/user/profile without authentication...');
        const profileRes = await fetch(`${BASE_URL}/api/user/profile`, { agent });

        if (profileRes.ok) {
            const profileData = await profileRes.json();
            console.log('   Status:', profileRes.status);
            console.log('   Profile mode:', profileData.mode || 'not set');
            console.log('   Plan:', profileData.plan);

            if (profileData.mode === 'DEV_MODE') {
                console.log('   ✅ DEV_MODE profile accessible without auth');
                console.log('   ⚠️  Warning message:', profileData.warning);
            } else if (profileRes.status === 401) {
                console.log('   ✅ Production mode - authentication required');
            } else {
                console.log('   ℹ️  Profile accessible (production mode)');
            }
            console.log('');
        }

        // Test 3: Execution block (should return 403 in DEV_MODE)
        console.log('3. Testing execution block...');
        const executeRes = await fetch(`${BASE_URL}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                variations: [{
                    id: 'test',
                    data: { sourcePath: '/test.mp4' }
                }]
            }),
            agent
        });

        console.log('   Status:', executeRes.status);

        if (executeRes.status === 403) {
            const errorData = await executeRes.json();
            console.log('   Error:', errorData.error);
            console.log('   Message:', errorData.message);

            if (errorData.error === 'DEV_MODE_RESTRICTED') {
                console.log('   ✅ Execution blocked in DEV_MODE');
            }
        } else if (executeRes.status === 401) {
            console.log('   ✅ Production mode - authentication required');
        }
        console.log('');

        // Test 4: Upload block (should return 403 in DEV_MODE)
        console.log('4. Testing upload block...');
        const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 'data' }),
            agent
        });

        console.log('   Status:', uploadRes.status);

        if (uploadRes.status === 403) {
            const errorData = await uploadRes.json();
            if (errorData.error === 'DEV_MODE_RESTRICTED') {
                console.log('   ✅ Upload blocked in DEV_MODE');
            }
        } else if (uploadRes.status === 401) {
            console.log('   ✅ Production mode - authentication required');
        }
        console.log('');

        console.log('\n=== DEV_MODE VERIFICATION SUMMARY ===');
        console.log('NOTE: Results depend on DEV_MODE environment variable');
        console.log('');
        console.log('If DEV_MODE=ON:');
        console.log('  - Profile should show DEV_MODE');
        console.log('  - Execution should be blocked with 403');
        console.log('  - Upload should be blocked with 403');
        console.log('');
        console.log('If DEV_MODE=OFF (Production):');
        console.log('  - Authentication required (401) for protected routes');
        console.log('  - Full security enforced');

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err.message);
        process.exit(1);
    }
}

testDevMode();
