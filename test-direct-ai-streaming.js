
console.log('🔍 Testing AI streaming logic directly...');

// Simulate the exact streaming response logic
function simulateStreamingResponse() {
    console.log('\n📡 Simulating streaming response processing...');
    
    // Mock streaming chunks that should come from Abacus AI
    const mockStreamChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"! Here"}}]}\n\n', 
        'data: {"choices":[{"delta":{"content":"\'s a"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" short"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" joke"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":": Why"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" don\'t"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" scientists"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" trust"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" atoms"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"? Because"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" they"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" make"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" up"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" everything"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
        'data: [DONE]\n\n'
    ];

    console.log('\n🎯 Processing chunks with API route logic...');
    
    let buffer = '';
    let partialRead = '';
    const outgoingChunks = [];

    for (const chunk of mockStreamChunks) {
        partialRead += chunk;
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                console.log('\n📦 Processing line:', data.substring(0, 50));
                
                if (data === '[DONE]') {
                    console.log('🏁 [DONE] signal - sending final result');
                    const finalData = {
                        status: 'completed',
                        result: {
                            content: buffer,
                            conversationId: 'test-123',
                            timestamp: new Date().toISOString(),
                        }
                    };
                    outgoingChunks.push(finalData);
                    console.log('✅ Final content length:', buffer.length);
                    console.log('📝 Final content:', buffer);
                    break;
                }

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    
                    if (content) {
                        buffer += content;
                        console.log('📡 Added content:', content);
                        console.log('📝 Buffer now:', buffer.substring(0, 50) + '...');
                        
                        // This is what gets sent to frontend
                        const contentData = {
                            status: 'streaming',
                            content: content
                        };
                        outgoingChunks.push(contentData);
                    } else {
                        const progressData = {
                            status: 'processing',
                            message: 'Generating response...'
                        };
                        outgoingChunks.push(progressData);
                    }
                } catch (e) {
                    console.log('⚠️ Skipping invalid JSON');
                }
            }
        }
    }

    console.log('\n🎯 Frontend processing simulation...');
    
    let frontendStreamingContent = '';
    let isStreaming = false;
    let finalMessage = '';

    for (const chunk of outgoingChunks) {
        console.log('\n📦 Frontend processing chunk:', chunk.status);
        
        if (chunk.status === 'processing') {
            console.log('⚡ Processing...');
        } else if (chunk.status === 'streaming') {
            isStreaming = true;
            if (chunk.content) {
                frontendStreamingContent += chunk.content;
                console.log('📡 Streaming content accumulated:', frontendStreamingContent.substring(0, 50) + '...');
            }
        } else if (chunk.status === 'completed') {
            console.log('✅ Completion received');
            console.log('🎯 API result content:', chunk.result?.content?.substring(0, 50) || 'NO CONTENT');
            console.log('📝 Frontend accumulated content:', frontendStreamingContent.substring(0, 50) || 'NO CONTENT');
            
            // This is the critical line from the frontend
            const finalContent = chunk.result?.content || frontendStreamingContent || 'No response received';
            finalMessage = finalContent;
            
            console.log('🏆 Final message that would be displayed:', finalMessage);
            isStreaming = false;
            frontendStreamingContent = '';
        }
    }

    console.log('\n📊 Final Results:');
    console.log('- API buffer length:', buffer.length);
    console.log('- Frontend final message length:', finalMessage.length);
    console.log('- Match between API and frontend:', buffer === finalMessage);
    
    if (buffer !== finalMessage) {
        console.log('❌ MISMATCH FOUND!');
        console.log('API buffer:', buffer.substring(0, 100));
        console.log('Frontend message:', finalMessage.substring(0, 100));
    } else {
        console.log('✅ Content matches perfectly');
    }
}

simulateStreamingResponse();
