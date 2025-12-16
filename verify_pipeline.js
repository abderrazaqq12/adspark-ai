const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. Create Dummy File
const TEST_FILE = 'e2e_test_video.mp4';
fs.writeFileSync(TEST_FILE, 'dummy video content ' + Date.now());

// Helper to run curl
const curl = (cmd) => new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
        if (err) reject(stderr || err);
        else resolve(stdout);
    });
});

async function runTest() {
    try {
        console.log('1. Uploading File...');
        // Use curl to upload
        const uploadCmd = `curl -s -F "file=@${TEST_FILE}" http://localhost:3001/render/upload`;
        const uploadRes = await curl(uploadCmd);
        const uploadJson = JSON.parse(uploadRes);
        console.log('Upload Result:', uploadJson);
        
        if (!uploadJson.url) throw new Error('No URL in upload response');

        console.log('2. Submitting Job...');
        const jobPayload = JSON.stringify({
            project_id: 'test_proj',
            variations: [{ id: 'v1', data: { source_url: uploadJson.url } }]
        });
        
        // Escape quotes for Windows cmd if needed, or just write to file and curl @file
        fs.writeFileSync('job_payload.json', jobPayload);
        const submitCmd = `curl -s -X POST -H "Content-Type: application/json" -d @job_payload.json http://localhost:3001/render/jobs`;
        const submitRes = await curl(submitCmd);
        const submitJson = JSON.parse(submitRes);
        console.log('Submit Result:', submitJson);

        if (!submitJson.ids || !submitJson.ids.length) throw new Error('No IDs in submit response');

        console.log('3. Polling Job...');
        const jobId = submitJson.ids[0];
        
        // Wait 2s
        await new Promise(r => setTimeout(r, 2000));
        
        const statusCmd = `curl -s http://localhost:3001/render/jobs/${jobId}`;
        const statusRes = await curl(statusCmd);
        console.log('Job Status:', statusRes);

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

runTest();
