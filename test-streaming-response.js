
console.log('🔍 Testing AI streaming response delivery...');

// Test the chat API directly to see what's being streamed
async function testStreamingResponse() {
    try {
        console.log('\n1. Testing AI API streaming response...');
        
        // Create a test conversation ID
        const conversationId = `test-${Date.now()}`;
        
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': 'sb-access-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzMzNzY0ODgyLCJpYXQiOjE3MzM3NjEyODIsImlzcyI6Imh0dHBzOi8vcHZmaXpya3Z6dmZrcGttZ3dobWwuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjI3ZmJlZjBhLTM1OTQtNDFmMS1hZmRjLTg5MzJjMWVjOTIwNyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzMzNzYxMjgyfV0sInNlc3Npb25faWQiOiIwZjE2YjI4ZS0zZjE4LTQ1NWEtOGVmMi00ZTk0YTFlM2YwY2IiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.example'
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'Hello! Can you tell me a short joke?' }
                ],
                conversationId: conversationId,
            }),
        });

        if (!response.ok) {
            console.error('❌ HTTP Error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            return;
        }

        console.log('✅ Response received, processing stream...');
        
        const reader = response.body?.getReader();
        if (!reader) {
            console.error('❌ No response body reader available');
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let partialRead = '';
        let chunkCount = 0;
        let streamingContent = '';

        console.log('\n📡 Processing streaming chunks:');
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('✅ Stream completed');
                break;
            }

            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    chunkCount++;
                    
                    if (data === '[DONE]') {
                        console.log(`\n🏁 Chunk ${chunkCount}: [DONE] signal received`);
                        break;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        console.log(`\n📦 Chunk ${chunkCount}:`, {
                            status: parsed.status,
                            hasContent: !!parsed.content,
                            contentLength: parsed.content?.length || 0,
                            contentPreview: parsed.content?.substring(0, 50) || '',
                            hasResult: !!parsed.result,
                            resultContent: parsed.result?.content?.substring(0, 50) || ''
                        });

                        if (parsed.status === 'processing') {
                            console.log('⚡ Processing status received');
                        } else if (parsed.status === 'streaming' && parsed.content) {
                            streamingContent += parsed.content;
                            console.log('📡 Streaming content added:', parsed.content);
                            console.log('📝 Total accumulated content:', streamingContent.substring(0, 100) + '...');
                        } else if (parsed.status === 'completed') {
                            console.log('✅ Completion status received');
                            console.log('🎯 Final result content:', parsed.result?.content?.substring(0, 100) || 'NO CONTENT');
                            console.log('📝 Accumulated streaming content:', streamingContent.substring(0, 100) || 'NO STREAMING CONTENT');
                        } else if (parsed.status === 'error') {
                            console.error('❌ Error status received:', parsed.error);
                        }
                    } catch (e) {
                        console.log(`⚠️ Chunk ${chunkCount}: Invalid JSON, skipping`);
                    }
                }
            }
        }

        console.log('\n📊 Final Summary:');
        console.log('- Total chunks processed:', chunkCount);
        console.log('- Final accumulated content:', streamingContent.substring(0, 200) || 'NO CONTENT');
        console.log('- Content length:', streamingContent.length);

        if (streamingContent.length === 0) {
            console.log('❌ ISSUE FOUND: No streaming content accumulated!');
        } else {
            console.log('✅ Streaming content successfully accumulated');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testStreamingResponse();
