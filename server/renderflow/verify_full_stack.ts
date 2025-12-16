import { sleep } from './utils';

// FlowScale Adapter Endpoint
const ADAPTER_URL = 'http://localhost:3000/api/render/renderflow';

async function verifyIntegration() {
    console.log('--- STARTING WRAPPER/ADAPTER VERIFICATION ---');

    // 1. Submit to Adapter (FlowScale format)
    // Logic: Client (StudioExport) -> POST Adapter -> POST RenderFlow
    console.log('1. Submitting Job to Adapter...');
    const res = await fetch(ADAPTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: 'integ_test_proj',
            scenes: [
                { video: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' }
            ]
        })
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Adapter Failed: ${res.status} ${txt}`);
    }

    const data: any = await res.json();
    // Expecting RenderFlow response format (as passed through)
    const jobs = data.data.jobs;
    if (!jobs || jobs.length === 0) throw new Error('Adapter returned no jobs');

    const jobId = jobs[0].id;
    console.log(`Job Created via Adapter: ${jobId}`);

    // 2. Poll Adapter for Status
    console.log('2. Polling Adapter...');
    let state = 'unknown';
    let attempts = 0;

    while (state !== 'done' && state !== 'failed' && attempts < 60) {
        await sleep(1000);
        const statusRes = await fetch(`${ADAPTER_URL}/jobs/${jobId}`);
        if (!statusRes.ok) throw new Error(`Adapter Poll Failed: ${statusRes.status}`);

        const status: any = await statusRes.json();
        if (status.state !== state) {
            console.log(`[Adapter Proxy] State -> ${status.state} | Progress: ${status.progress}%`);
            state = status.state;
        }
        attempts++;
    }

    if (state === 'done') {
        console.log('✅ SUCCESS: Integration Verified. Adapter correctly proxies to RenderFlow.');
        process.exit(0);
    } else {
        console.error(`❌ FAILED: Job ended in ${state}`);
        process.exit(1);
    }
}

// Ensure Adapter (server/api.js) is running. 
// Note: In this environment, I might need to run this script while manually ensuring api.js is up.
// For now, I'll assume port 8080 is the target.
verifyIntegration();
