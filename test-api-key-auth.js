
const apiKey = '3250288c54dc464d80791cfcafa9f430';

console.log('🔐 Testing Abacus AI API key authentication...');
console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'Missing');

async function testApiKey() {
  try {
    console.log('\n📡 Sending test request to Abacus AI...');
    
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'user', content: 'Hello, please respond with "API key works!"' }
        ],
        stream: false,
        max_tokens: 50
      })
    });

    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    
    if (response.status === 401) {
      console.log('❌ AUTHENTICATION FAILED - API key is invalid or expired');
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return false;
    }
    
    if (!response.ok) {
      console.log('❌ API call failed with status:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ API key is valid!');
    console.log('Response:', data);
    return true;
    
  } catch (error) {
    console.error('❌ Error testing API key:', error.message);
    return false;
  }
}

testApiKey().then(success => {
  if (!success) {
    console.log('\n🔧 API key authentication failed. Need to initialize new API key.');
  }
});
