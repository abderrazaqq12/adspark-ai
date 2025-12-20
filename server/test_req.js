import http from 'http';

const data = JSON.stringify({
    project_id: "test_internal",
    variations: [{
        id: "v1",
        data: {
            source_url: "http://example.com/video.mp4"
        }
    }]
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/render/jobs',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
