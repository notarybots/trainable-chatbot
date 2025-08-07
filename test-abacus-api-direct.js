
const fetch = require('node-fetch');

async function testAbacusAPI() {
  const API_KEY = "3250288c54dc464d80791cfcafa9f430";
  
  console.log('🧪 Testing Abacus.AI API connection...');
  console.log('📋 API Key:', API_KEY.substring(0, 8) + '...');
  
  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello! Can you say "API connection successful"?' }
        ],
        stream: false,
        max_tokens: 100,
        temperature: 0.7,
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

    const data = await response.json();
    console.log('✅ API Response:', data);
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('✅ AI Response:', data.choices[0].message.content);
      return true;
    } else {
      console.error('❌ Unexpected response format:', data);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Network/Parse error:', error.message);
    return false;
  }
}

testAbacusAPI()
  .then(success => {
    if (success) {
      console.log('🎉 Abacus.AI API test PASSED!');
      process.exit(0);
    } else {
      console.log('💥 Abacus.AI API test FAILED!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  });
