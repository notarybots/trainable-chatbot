
const fetch = require('node-fetch');

console.log('🧪 SIMPLE API TEST');
console.log('==================');

async function testAPI() {
  console.log('\n1. TESTING API WITHOUT AUTH...');
  
  // Test API without any authentication
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        conversationId: 'test'
      })
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
    
    // Check if this is still 401 or if we get a different error
    if (response.status === 401) {
      console.log('✅ Expected 401 - API route is running');
    } else {
      console.log('🔍 Different status - API route behavior changed');
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
  
  console.log('\n2. TESTING HEALTH ENDPOINT...');
  
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET'
    });
    console.log('Health endpoint status:', response.status);
  } catch (error) {
    console.log('❌ Health endpoint not found (expected)');
  }
  
  console.log('\n3. CHECKING SERVER LOGS...');
  
  // Try to trigger some server-side logging
  console.log('Test completed - check server logs for any output');
}

testAPI().catch(console.error);
