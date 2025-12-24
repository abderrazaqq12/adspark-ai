import https from 'https';

const options = {
    hostname: '72.62.26.4',
    port: 443,
    path: '/api/user/profile',
    method: 'GET',
    headers: {
        'Accept': 'application/json'
    },
    rejectUnauthorized: false
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
