import fetch from 'node-fetch';
import https from 'https';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://72.62.26.4';
const ADMIN_PASSWORD = 'flowscale-admin-secure-2024';

const agent = new https.Agent({
    rejectUnauthorized: false
});

async function testUpload() {
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

        // 2. Create a small test file
        console.log('2. Creating test file...');
        const testFile = path.join(process.cwd(), 'test_upload.txt');
        fs.writeFileSync(testFile, 'This is a test upload file');
        console.log('   ✓ Test file created');

        // 3. Test upload
        console.log('3. Testing file upload...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFile));

        const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData,
            agent
        });

        if (!uploadRes.ok) {
            const error = await uploadRes.text();
            throw new Error(`Upload failed: ${uploadRes.status} - ${error}`);
        }

        const uploadData = await uploadRes.json();
        console.log('   ✓ File uploaded successfully');
        console.log('   Upload response:', JSON.stringify(uploadData, null, 2));

        if (uploadData.ok && uploadData.url) {
            console.log('   ✓ Upload returned URL:', uploadData.url);
        } else {
            console.log('   ⚠ Warning: Response structure unexpected');
        }

        // Cleanup
        fs.unlinkSync(testFile);
        console.log('   ✓ Test file cleaned up');

        console.log('\n✅ SUCCESS: File upload working correctly!');
        console.log('Your video uploads should now work on the VPS.');

    } catch (err) {
        console.error('\n❌ VERIFICATION FAILED:', err.message);
        process.exit(1);
    }
}

testUpload();
