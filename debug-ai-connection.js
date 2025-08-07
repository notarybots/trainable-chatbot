
const fetch = require('node-fetch');
require('dotenv').config();

async function debugAIConnection() {
    console.log('🔍 Starting AI Connection Debug');
    console.log('=====================================');
    
    // Step 1: Check environment variables
    console.log('1. Environment Variables:');
    console.log('   ABACUSAI_API_KEY exists:', !!process.env.ABACUSAI_API_KEY);
    console.log('   ABACUSAI_API_KEY length:', process.env.ABACUSAI_API_KEY?.length || 'undefined');
    
    if (!process.env.ABACUSAI_API_KEY) {
        console.log('❌ ABACUSAI_API_KEY is missing!');
        return;
    }
    
    // Step 2: Test API endpoint directly
    console.log('\n2. Testing Abacus.AI API directly...');
    
    const testMessages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, are you working?' }
    ];
    
    try {
        console.log('   Making API request...');
        const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: testMessages,
                stream: false, // Test without streaming first
                max_tokens: 50,
                temperature: 0.7,
            }),
        });
        
        console.log('   Response status:', response.status);
        console.log('   Response headers:', Object.fromEntries(response.headers));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ API Error Response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('✅ API Success! Response structure:');
        console.log('   choices.length:', data.choices?.length);
        console.log('   message.content:', data.choices?.[0]?.message?.content);
        console.log('   Full response:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.log('❌ API Request Failed:', error.message);
        console.log('   Error details:', error);
    }
    
    // Step 3: Test streaming endpoint
    console.log('\n3. Testing streaming endpoint...');
    
    try {
        const streamResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: testMessages,
                stream: true,
                max_tokens: 50,
                temperature: 0.7,
            }),
        });
        
        console.log('   Stream response status:', streamResponse.status);
        
        if (!streamResponse.ok) {
            const errorText = await streamResponse.text();
            console.log('❌ Stream API Error:', errorText);
            return;
        }
        
        console.log('✅ Stream API connected successfully');
        console.log('   Processing first few chunks...');
        
        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let chunkCount = 0;
        let content = '';
        
        try {
            while (chunkCount < 5) { // Just test first 5 chunks
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            console.log('   Stream completed successfully');
                            break;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            const deltaContent = parsed.choices?.[0]?.delta?.content || '';
                            if (deltaContent) {
                                content += deltaContent;
                                console.log(`   Chunk ${chunkCount + 1}: "${deltaContent}"`);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
                
                chunkCount++;
            }
            
            console.log('✅ Stream test completed successfully');
            console.log('   Accumulated content:', `"${content}"`);
            
        } finally {
            reader.releaseLock();
        }
        
    } catch (error) {
        console.log('❌ Streaming test failed:', error.message);
    }
    
    console.log('\n🎯 Debug Complete!');
}

debugAIConnection().catch(console.error);
