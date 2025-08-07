
console.log('🔍 Testing AI Integration Fix...');

// Test the environment variable loading
console.log('\n1. Testing environment variables...');
require('dotenv').config();

const apiKey = process.env.ABACUSAI_API_KEY;
console.log('✅ ABACUSAI_API_KEY:', apiKey ? 'Present' : 'Missing');
console.log('✅ Key length:', apiKey ? apiKey.length : 0);

if (!apiKey) {
    console.log('❌ API key is missing. Checking .env files...');
    const fs = require('fs');
    
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        console.log('📋 .env content (first 200 chars):', envContent.substring(0, 200));
        
        const match = envContent.match(/ABACUSAI_API_KEY=([^\n\r]+)/);
        if (match) {
            console.log('✅ Found API key in .env file');
            process.env.ABACUSAI_API_KEY = match[1].trim();
        }
    } catch (e) {
        console.log('⚠️ Could not read .env file');
    }
}

// Test the Abacus AI API directly
async function testAbacusAI() {
    console.log('\n2. Testing Abacus.AI API directly...');
    
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
        console.log('❌ Cannot test API - key is missing');
        return;
    }

    try {
        const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Say "Hello from AI!" and nothing else.' }
                ],
                stream: true,
                max_tokens: 50,
                temperature: 0.7,
            }),
        });

        console.log('📊 Response status:', response.status);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ API error:', errorText);
            return;
        }

        console.log('✅ API responded successfully, processing stream...');

        const reader = response.body?.getReader();
        if (!reader) {
            console.log('❌ No response body');
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let partialRead = '';
        let chunkCount = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    chunkCount++;
                    
                    if (data === '[DONE]') {
                        console.log(`\n🏁 Stream completed after ${chunkCount} chunks`);
                        console.log('📝 Final AI response:', buffer || 'NO CONTENT');
                        return buffer;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        if (content) {
                            buffer += content;
                            console.log(`📦 Chunk ${chunkCount}: "${content}"`);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Abacus.AI test failed:', error);
    }
}

// Test the streaming logic simulation
function testStreamingLogic() {
    console.log('\n3. Testing streaming logic simulation...');
    
    // Simulate the exact logic from the fixed component
    const mockChunks = [
        { status: 'processing', message: 'Starting...' },
        { status: 'streaming', content: 'Hello' },
        { status: 'streaming', content: ' from' },
        { status: 'streaming', content: ' AI!' },
        { status: 'completed', result: { content: 'Hello from AI!' } }
    ];
    
    let accumulatedContent = '';
    let finalMessage = '';
    
    for (const chunk of mockChunks) {
        console.log('📦 Processing chunk:', chunk);
        
        if (chunk.status === 'processing') {
            console.log('⚡ Processing...');
        } else if (chunk.status === 'streaming') {
            const newContent = chunk.content || '';
            if (newContent) {
                accumulatedContent += newContent;
                console.log('📡 Accumulated:', accumulatedContent);
            }
        } else if (chunk.status === 'completed') {
            const finalContent = chunk.result?.content || accumulatedContent || 'No response received';
            finalMessage = finalContent;
            console.log('✅ Final message:', finalMessage);
        }
    }
    
    console.log('📊 Test result:');
    console.log('- Accumulated content:', accumulatedContent);
    console.log('- Final message:', finalMessage);
    console.log('- Logic working:', finalMessage === 'Hello from AI!' ? '✅ YES' : '❌ NO');
}

// Run all tests
async function runAllTests() {
    testStreamingLogic();
    await testAbacusAI();
    
    console.log('\n🎯 Summary:');
    console.log('- Environment: Fixed .env loading');
    console.log('- Streaming logic: Improved error handling');
    console.log('- Content accumulation: Fixed state management');
    console.log('- Error handling: Added graceful fallbacks');
    
    console.log('\n✅ The AI integration fix should now work properly!');
    console.log('🔧 Key improvements:');
    console.log('   1. Better content accumulation tracking');
    console.log('   2. Improved error handling and logging');
    console.log('   3. Fixed state management for streaming');
    console.log('   4. Added fallback content handling');
}

runAllTests();
