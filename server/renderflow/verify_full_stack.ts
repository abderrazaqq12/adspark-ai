
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE = 'http://localhost:3001/render';
const TEST_FILE_NAME = 'test_vid.mp4';
const TEST_FILE_PATH = path.join(__dirname, TEST_FILE_NAME);

// Colors
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m"
};

async function runTest() {
    console.log(`${colors.blue}[TEST] Starting Full Stack Integration Test...${colors.reset}`);

    // 0. Ensure Test File Exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
        console.log(`${colors.yellow}[TEST] Creating dummy test video file...${colors.reset}`);
        fs.writeFileSync(TEST_FILE_PATH, 'dummy video content for mock testing');
    }

    try {
        // 1. Upload
        console.log(`${colors.blue}[TEST] Step 1: Uploading file...${colors.reset}`);
        const formData = new FormData();
        const fileContent = fs.readFileSync(TEST_FILE_PATH);
        const blob = new Blob([fileContent], { type: 'video/mp4' });
        formData.append('file', blob, TEST_FILE_NAME);

        const uploadRes = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
        const uploadData = await uploadRes.json();
        console.log(`${colors.green}[PASS] Upload successful:${colors.reset}`, uploadData);

        if (!uploadData.filePath || !uploadData.ok) {
            throw new Error('Upload response missing filePath or ok:true');
        }

        // 2. Execute Simple Job
        console.log(`${colors.blue}[TEST] Step 2: Queueing Execute Job...${colors.reset}`);
        const execRes = await fetch(`${API_BASE}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourcePath: uploadData.url, // Test URL flow (since download is handled by engine)
                // OR sourcePath: uploadData.filePath // Test local path flow
                trim: { start: 0, end: 5 }
            })
        });

        if (!execRes.ok) throw new Error(`Execute failed: ${execRes.status}`);
        const execData = await execRes.json();
        console.log(`${colors.green}[PASS] Job Queued:${colors.reset}`, execData);

        const jobId = execData.jobId;

        // 3. Poll Status
        console.log(`${colors.blue}[TEST] Step 3: Polling Job ${jobId}...${colors.reset}`);

        let attempts = 0;
        while (attempts < 20) {
            const statusRes = await fetch(`${API_BASE}/jobs/${jobId}`);
            const statusData = await statusRes.json();

            console.log(`[Poll] Status: ${statusData.status}, Progress: ${statusData.progressPct}%`);

            if (statusData.status === 'done') {
                console.log(`${colors.green}[PASS] Job Completed!${colors.reset}`);
                console.log('Output URL:', statusData.outputUrl);
                break;
            } else if (statusData.status === 'failed' || statusData.status === 'error') {
                console.error(`${colors.red}[FAIL] Job Failed:${colors.reset}`, statusData.error);
                process.exit(1);
            }

            await new Promise(r => setTimeout(r, 1000));
            attempts++;
        }

        if (attempts >= 20) {
            console.error(`${colors.red}[FAIL] Job Timed Out${colors.reset}`);
            process.exit(1);
        }

        // 4. Test Plan Execution
        console.log(`${colors.blue}[TEST] Step 4: Queueing Execution Plan...${colors.reset}`);
        const planRes = await fetch(`${API_BASE}/execute-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceVideoUrl: uploadData.url,
                plan: {
                    timeline: [],
                    audio_tracks: [],
                    output_format: { width: 1080, height: 1920 }
                }
            })
        });

        if (!planRes.ok) throw new Error(`Plan Execute failed: ${planRes.status}`);
        const planData = await planRes.json();
        console.log(`${colors.green}[PASS] Plan Job Queued:${colors.reset}`, planData);

        console.log(`${colors.green}[SUCCESS] All integration tests passed.${colors.reset}`);

    } catch (err: any) {
        console.error(`${colors.red}[FAIL] Test Error:${colors.reset}`, err);
        process.exit(1);
    }
}

runTest();
