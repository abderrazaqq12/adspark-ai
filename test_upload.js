const fs = require('fs');
const path = require('path');

async function testUpload() {
    const FormData = (await import('formdata-node')).FormData;
    const { fileFromPath } = await import('formdata-node/file-from-path');
    const fetch = (await import('node-fetch')).default;

    // Create dummy file
    const testFile = path.join(__dirname, 'test_vid.mp4');
    fs.writeFileSync(testFile, 'dummy video content');

    const form = new FormData();
    form.append('file', await fileFromPath(testFile));

    console.log('Uploading to http://localhost:3001/render/upload...');
    try {
        const res = await fetch('http://localhost:3001/render/upload', {
            method: 'POST',
            body: form
        });

        if (!res.ok) {
            console.error('Upload Failed:', res.status, res.statusText);
            const txt = await res.text();
            console.error('Body:', txt);
            return;
        }

        const json = await res.json();
        console.log('Upload Success:', json);
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testUpload();
