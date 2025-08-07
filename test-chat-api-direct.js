
const fetch = require('node-fetch');
require('dotenv').config();

async function testChatAPI() {
    console.log('🔍 Testing Chat API Route Directly');
    console.log('===================================');
    
    // Test data
    const testRequest = {
        messages: [
            { role: 'user', content: 'Hello, are you working now?' }
        ],
        conversationId: 'test-conv-123',
        model: 'gpt-4.1-mini'
    };
    
    try {
        console.log('1. Starting dev server test...');
        
        // First, let's start the dev server in background
        const { spawn } = require('child_process');
        const devServer = spawn('yarn', ['dev'], { 
            cwd: '/home/ubuntu/trainable-chatbot',
            detached: true,
            stdio: 'pipe'
        });
        
        console.log('2. Waiting for server to start...');
        await new Promise(resolve => setTimeout(resolve, 8000)); // Wait 8 seconds
        
        console.log('3. Testing chat API endpoint...');
        
        // Test the API endpoint
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testRequest),
        });
        
        console.log('   API Response Status:', response.status);
        console.log('   API Response Headers:', Object.fromEntries(response.headers));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ API Error Response:', errorText);
            return;
        }
        
        // Check if it's a streaming response
        const contentType = response.headers.get('content-type');
        console.log('   Content-Type:', contentType);
        
        if (contentType?.includes('text/plain')) {
            console.log('✅ Got streaming response! Reading stream...');
            
            const responseText = await response.text();
            console.log('   Raw stream data:');
            console.log(responseText);
            
            // Parse the stream data
            const lines = responseText.split('\n');
            let finalResult = null;
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data !== '[DONE]' && data.trim()) {
                        try {
                            const parsed = JSON.parse(data);
                            console.log('   Parsed stream chunk:', parsed);
                            
                            if (parsed.status === 'completed') {
                                finalResult = parsed.result;
                            }
                        } catch (e) {
                            console.log('   Unparseable chunk:', data);
                        }
                    }
                }
            }
            
            if (finalResult) {
                console.log('✅ SUCCESS! Final AI Response:', finalResult.content);
            } else {
                console.log('❌ No final result found in stream');
            }
            
        } else {
            const jsonResponse = await response.json();
            console.log('   JSON Response:', JSON.stringify(jsonResponse, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('   Error details:', error);
        
    } finally {
        // Clean up - kill the dev server
        console.log('4. Cleaning up...');
        try {
            // Kill any Node processes on port 3000
            const { exec } = require('child_process');
            exec('pkill -f "next dev" || pkill -f "node.*3000" || true', (err) => {
                if (err) console.log('   Cleanup note:', err.message);
                else console.log('   Server cleanup completed');
            });
        } catch (e) {
            console.log('   Cleanup error:', e.message);
        }
    }
    
    console.log('\n🎯 Test Complete!');
}

testChatAPI().catch(console.error);
