
const fetch = require('node-fetch');

async function testChatAPI() {
    console.log('Testing Chat API...');
    
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'Hello, this is a test message' }
                ],
                conversationId: 'test-conv-id'
            }),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            console.log('Response is streaming...');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    console.log('Received chunk:', chunk);
                }
            } catch (streamError) {
                console.error('Stream reading error:', streamError.message);
            }
        } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
        }
        
    } catch (error) {
        console.error('Request failed:', error.message);
    }
}

testChatAPI();
