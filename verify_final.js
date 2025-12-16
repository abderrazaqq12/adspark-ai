const { exec } = require('child_process');
const fs = require('fs');

const TEST_FILE = 'e2e_test_final.mp4';
fs.writeFileSync(TEST_FILE, 'final verification content ' + Date.now());

function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`Command Error: ${cmd}`, stderr);
                // Curl might output to stderr even on success
                // resolve(stdout || stderr); 
                // Let's rely on stdout for JSON
            }
            resolve(stdout);
        });
    });
}

async function verify() {
    console.log('[1/3] Uploading File...');
    // -s = silent, -F = form
    // Must look for JSON output
    const uploadOut = await runCommand(`curl -s -F "file=@${TEST_FILE}" http://localhost:3001/render/upload`);
    console.log('Upload Raw:', uploadOut);

    let uploadJson;
    try { uploadJson = JSON.parse(uploadOut); } catch (e) { console.error('Invalid JSON', e); return; }

    if (!uploadJson.url) {
        console.error('Upload Failed: No URL returned');
        return;
    }
    console.log('Upload Success! URL:', uploadJson.url);

    console.log('[2/3] Submitting Job...');
    const payload = JSON.stringify({
        project_id: 'verify_cli',
        variations: [{ id: 'v_cli', data: { source_url: uploadJson.url } }]
    });
    // Escape for Windows CMD: replace " with \"
    const escapedPayload = payload.replace(/"/g, '\\"');

    const submitOut = await runCommand(`curl -s -X POST -H "Content-Type: application/json" -d "${escapedPayload}" http://localhost:3001/render/jobs`);
    console.log('Submit Raw:', submitOut);

    let submitJson;
    try { submitJson = JSON.parse(submitOut); } catch (e) {
        // Retry with file payload if escaping failed
        fs.writeFileSync('payload.json', payload);
        const retryOut = await runCommand(`curl -s -X POST -H "Content-Type: application/json" -d @payload.json http://localhost:3001/render/jobs`);
        try { submitJson = JSON.parse(retryOut); } catch (err) { console.error('Submit Failed', err); return; }
    }

    if (!submitJson.ids) { console.error('Submit Failed'); return; }
    console.log('Job Submitted! IDs:', submitJson.ids);

    console.log('[3/3] Polling Job...');
    const jobId = submitJson.ids[0];
    const statusOut = await runCommand(`curl -s http://localhost:3001/render/jobs/${jobId}`);
    console.log('Job Status:', statusOut);
    console.log('VERIFICATION COMPLETE');
}

verify();
