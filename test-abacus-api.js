
const fetch = require('node-fetch');
require('dotenv').config({ path: './app/.env' });

async function testAbacusAPI() {
  const apiKey = process.env.ABACUSAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ABACUSAI_API_KEY not found in environment');
    return false;
  }

  console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');

  const messages = [
    {
      role: 'system',
      content: 'You are a helpful AI assistant.'
    },
    {
      role: 'user', 
      content: 'Hello! Can you tell me a short joke?'
    }
  ];

  try {
    console.log('📤 Sending request to Abacus.AI...');
    
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        stream: false,
        max_tokens: 100,
        temperature: 0.7
      }),
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ API Response received');
    console.log('🤖 AI Response:', data.choices?.[0]?.message?.content || 'No content');
    
    return true;
  } catch (error) {
    console.error('❌ Error calling Abacus.AI API:', error.message);
    return false;
  }
}

async function testStreamingAPI() {
  const apiKey = process.env.ABACUSAI_API_KEY;
  
  console.log('\n📡 Testing streaming API...');

  const messages = [
    {
      role: 'user', 
      content: 'Count from 1 to 5, saying each number on a new line.'
    }
  ];

  try {
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
        max_tokens: 100
      }),
    });

    if (!response.ok) {
      console.error('❌ Streaming API Error:', response.status);
      return false;
    }

    console.log('📥 Receiving streaming response...');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let partialRead = '';

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
            console.log('✅ Streaming completed');
            console.log('📝 Full response:', buffer);
            return true;
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
    }
    
    return true;
  } catch (error) {
    console.error('❌ Streaming API Error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Abacus.AI API Integration\n');
  
  const basicTest = await testAbacusAPI();
  if (!basicTest) {
    console.log('\n❌ Basic API test failed');
    return;
  }
  
  const streamTest = await testStreamingAPI();
  if (!streamTest) {
    console.log('\n❌ Streaming API test failed');
    return;
  }
  
  console.log('\n\n✅ All API tests passed! Abacus.AI integration is working correctly.');
  console.log('💡 The chat backend should work properly with these API calls.');
}

main().catch(console.error);
