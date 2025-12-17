const http = require('http');

const payload = JSON.stringify({
    source_url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    output_format: "mp4",
    resolution: "640x360"
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/render/jobs',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);

        if (res.statusCode === 200) {
            const jobId = JSON.parse(data).id;
            checkStatus(jobId);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();

function checkStatus(id) {
    console.log(`Checking status for job ${id}...`);
    const interval = setInterval(() => {
        http.get(`http://localhost:3001/render/jobs/${id}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const job = JSON.parse(data);
                console.log('Job Status:', job.status);
                if (job.status === 'done' || job.status === 'failed') {
                    clearInterval(interval);
                    console.log('Final Job Data:', job);
                }
            });
        });
    }, 2000);
}
