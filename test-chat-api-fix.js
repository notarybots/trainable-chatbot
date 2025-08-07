
const fetch = require('node-fetch');

async function testChatAPI() {
  console.log('🧪 Testing Chat API with correct environment...');
  
  try {
    // Test with a simple message
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Say "Hello from the AI!"' }
        ],
        conversationId: 'test-conversation-123',
      }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      return false;
    }

    // Since this is a streaming response, let's process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let partialRead = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('📡 Stream completed');
              break;
            }

            try {
              const parsed = JSON.parse(data);
              console.log('📋 Stream data:', parsed);
              
              if (parsed.status === 'completed' && parsed.result) {
                fullResponse = parsed.result.content || parsed.result;
                console.log('✅ AI Response received:', fullResponse);
                return true;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (streamError) {
      console.error('❌ Stream processing error:', streamError);
      return false;
    }

    if (fullResponse) {
      console.log('✅ Final AI Response:', fullResponse);
      return true;
    } else {
      console.error('❌ No AI response received');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Network/Parse error:', error.message);
    return false;
  }
}

// Note: This test requires the Next.js server to be running
console.log('⚠️ Make sure the Next.js server is running on localhost:3000');
console.log('⚠️ If not, run: cd /home/ubuntu/trainable-chatbot && yarn dev');

testChatAPI()
  .then(success => {
    if (success) {
      console.log('🎉 Chat API test PASSED! AI integration is working!');
      process.exit(0);
    } else {
      console.log('💥 Chat API test FAILED! Check the logs above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  });
