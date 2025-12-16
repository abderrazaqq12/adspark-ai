import { sleep } from './utils';

const API_URL = 'http://localhost:3001/render';

// Sample video that is safe and small
const SAMPLE_URL = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

async function verify() {
    console.log('--- STARTING RENDERFLOW VERIFICATION ---');

    // 1. Submit Job
    console.log('1. Submitting Job...');
    const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            project_id: 'verify_test',
            variations: [
                { id: 'v1', data: { source_url: SAMPLE_URL, trim: { start: 0, end: 5 } } }
            ]
        })
    });

    if (!res.ok) throw new Error(`Submit failed: ${res.statusText}`);
    const data: any = await res.json();
    const jobId = data.data.jobs[0].id;
    console.log(`Job Created: ${jobId}`);

    // 2. Poll Status
    console.log('2. Polling Status...');
    let state = 'queued';
    let attempts = 0;

    while (state !== 'done' && state !== 'failed' && attempts < 60) { // 60s timeout
        await sleep(1000);
        const statusRes = await fetch(`${API_URL}/jobs/${jobId}`);
        const status: any = await statusRes.json();

        // Only log if state changed
        if (status.state !== state) {
            console.log(`[${new Date().toISOString()}] State -> ${status.state} | Progress: ${status.progress}%`);
            state = status.state;
        }
        attempts++;
    }

    if (state === 'done') {
        console.log('✅ SUCCESS: Job verified.');
        process.exit(0);
    } else {
        console.error(`❌ FAILED: Job ended in ${state}`);
        process.exit(1);
    }
}

// Simple delay to allow server to boot if run concurrently
setTimeout(verify, 2000);
