
// Direct test of the LLM API integration logic
const fetch = require('node-fetch');

async function testLLMIntegration() {
    console.log('🔍 Testing LLM Integration...');
    
    // Test the Abacus AI endpoint directly
    console.log('\n1️⃣ Testing Abacus AI API directly...');
    
    const apiKey = process.env.ABACUSAI_API_KEY || '3250288c54dc464d80791cfcafa9f430';
    console.log('Using API Key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
    
    try {
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful AI assistant.'
            },
            {
                role: 'user',
                content: 'Hello! Please say "Test successful" if you can hear me.'
            }
        ];
        
        console.log('Sending request to Abacus AI...');
        const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: messages,
                stream: true,
                max_tokens: 3000,
                temperature: 0.7,
            }),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            return;
        }
        
        console.log('✅ API responded successfully');
        console.log('\n2️⃣ Processing streaming response...');
        
        // Handle streaming response in Node.js
        let buffer = '';
        let partialRead = '';
        
        return new Promise((resolve, reject) => {
            response.body.on('data', (chunk) => {
                partialRead += chunk.toString();
                let lines = partialRead.split('\n');
                partialRead = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            console.log('\n🏁 Streaming completed');
                            console.log('Full response:', buffer);
                            resolve();
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                                buffer += content;
                                process.stdout.write(content);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            });
            
            response.body.on('end', () => {
                console.log('\n✅ Stream ended');
                console.log('Buffer length:', buffer.length);
                resolve();
            });
            
            response.body.on('error', (err) => {
                console.error('❌ Stream error:', err);
                reject(err);
            });
        });
        
        if (buffer.trim()) {
            console.log('\n✅ LLM Integration test successful!');
            console.log('Response length:', buffer.length);
        } else {
            console.log('\n⚠️ No content received from LLM');
        }
        
    } catch (error) {
        console.error('💥 LLM Integration test failed:', error.message);
    }
}

testLLMIntegration();
