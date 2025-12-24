import fetch from 'node-fetch';
import https from 'https';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'https://72.62.26.4';
const ADMIN_PASSWORD = 'flowscale-admin-secure-2024';

const agent = new https.Agent({
    rejectUnauthorized: false
});

async function testVideoUpload() {
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

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('   ✓ Login successful');

        // 2. Create a test video file (minimal MP4)
        console.log('2. Creating test MP4 file...');
        // Minimal valid MP4 header
        const mp4Buffer = Buffer.from([
            0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
            0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
            0x6D, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65
        ]);

        const testFile = 'test_video.mp4';
        fs.writeFileSync(testFile, mp4Buffer);
        console.log('   ✓ Test MP4 created');

        // 3. Test upload WITHOUT projectId
        console.log('3. Testing video upload (no projectId)...');
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

        const uploadText = await uploadRes.text();

        if (!uploadRes.ok) {
            console.log('   ✗ Upload failed:', uploadRes.status);
            console.log('   Error:', uploadText);
            throw new Error(uploadText);
        }

        const uploadData = JSON.parse(uploadText);
        console.log('   ✓ Upload successful!');
        console.log('   Response:', JSON.stringify(uploadData, null, 2));

        // Cleanup
        fs.unlinkSync(testFile);
        console.log('\n✅ SUCCESS: Video upload is working!');

    } catch (err) {
        console.error('\n❌ UPLOAD TEST FAILED:', err.message);
        if (fs.existsSync('test_video.mp4')) {
            fs.unlinkSync('test_video.mp4');
        }
        process.exit(1);
    }
}

testVideoUpload();
