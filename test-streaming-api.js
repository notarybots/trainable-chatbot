// Test streaming AbacusAI API
const testStreamingAPI = async () => {
  try {
    console.log('Testing AbacusAI streaming API directly...');
    
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 3250288c54dc464d80791cfcafa9f430'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'user', content: 'Say hello world' }
        ],
        stream: true,
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let partialRead = '';

    console.log('Starting to read streaming response...');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('Stream finished');
        break;
      }

      partialRead += decoder.decode(value, { stream: true });
      let lines = partialRead.split('\n');
      partialRead = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('Received [DONE]');
            break;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              console.log('Chunk content:', JSON.stringify(content));
              buffer += content;
            }
          } catch (e) {
            console.log('Skipping invalid JSON:', data.substring(0, 100));
          }
        }
      }
    }

    console.log('Final accumulated buffer:', JSON.stringify(buffer));
    console.log('Buffer length:', buffer.length);
    
  } catch (error) {
    console.error('Streaming test error:', error);
  }
};

testStreamingAPI();
