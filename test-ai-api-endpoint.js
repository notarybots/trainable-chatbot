
console.log('🔍 Testing AI API endpoint directly...');

const http = require('http');

function testAIEndpoint() {
    const postData = JSON.stringify({
        messages: [
            { role: 'user', content: 'Hello! Tell me a short joke.' }
        ],
        conversationId: 'test-123'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            // Add a basic auth cookie to simulate being logged in
            'Cookie': 'sb-access-token=test'
        }
    };

    console.log('📡 Sending request to API endpoint...');

    const req = http.request(options, (res) => {
        console.log(`\n📊 Response Status: ${res.statusCode}`);
        console.log(`📋 Response Headers:`, res.headers);

        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
            console.log('📦 Chunk received:', chunk.toString().substring(0, 100));
        });

        res.on('end', () => {
            console.log('\n✅ Response complete');
            console.log('📝 Full response:', data.substring(0, 500));
            
            if (res.statusCode !== 200) {
                console.log('❌ Non-200 status code received');
                try {
                    const errorData = JSON.parse(data);
                    console.log('🔍 Error details:', errorData);
                } catch (e) {
                    console.log('🔍 Raw error response:', data);
                }
            } else {
                console.log('✅ Success! API endpoint is responding');
            }
        });
    });

    req.on('error', (e) => {
        console.error('❌ Request error:', e);
    });

    req.write(postData);
    req.end();
}

// Wait a moment for server to be ready
setTimeout(testAIEndpoint, 2000);
