import fetch from 'node-fetch';
import https from 'https';

const BASE_URL = 'https://72.62.26.4'; // Note HTTPS to handle the redirect or direct SSL
const ADMIN_PASSWORD = 'flowscale-admin-secure-2024';

const agent = new https.Agent({
    rejectUnauthorized: false
});

async function verify() {
    try {
        // 1. Login
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
            const text = await loginRes.text();
            throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText} - ${text}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('   Login successful. Token received.');

        // 2. Fetch Profile
        console.log('2. Fetching Profile...');
        const profileRes = await fetch(`${BASE_URL}/api/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            agent
        });

        if (!profileRes.ok) {
            const text = await profileRes.text();
            throw new Error(`Profile fetch failed: ${profileRes.status} ${profileRes.statusText} - ${text}`);
        }

        const profile = await profileRes.json();
        console.log('   Profile verified:', profile);

        if (profile.credits > 90000) {
            console.log('SUCCESS: Unlimited credits confirmed for VPS Admin.');
        } else {
            console.log('WARNING: Credits count seems low:', profile.credits);
        }

    } catch (err) {
        console.error('VERIFICATION FAILED:', err.message);
        process.exit(1);
    }
}

verify();
