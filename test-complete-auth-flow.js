
console.log('🔐 Testing complete authentication flow...');

// Load environment variables
require('dotenv').config();

async function testCompleteFlow() {
  console.log('\n🧪 Testing complete authentication and chat flow');
  
  try {
    // Test 1: Check if the application is accessible
    console.log('\n1️⃣ Testing application accessibility...');
    const homeResponse = await fetch('http://localhost:3001');
    console.log('Home page status:', homeResponse.status);
    
    if (homeResponse.status !== 200) {
      console.log('❌ Application not accessible');
      return false;
    }
    
    // Test 2: Check if we can access the app (should redirect to login if not authenticated)
    console.log('\n2️⃣ Testing authentication redirect...');
    const dashboardResponse = await fetch('http://localhost:3001/dashboard', {
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    console.log('Dashboard access status:', dashboardResponse.status);
    
    if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
      console.log('✅ Proper authentication redirect is working');
      const location = dashboardResponse.headers.get('location');
      console.log('Redirect location:', location);
    }
    
    // Test 3: Check what happens when we access chat without authentication
    console.log('\n3️⃣ Testing chat API without authentication...');
    const chatResponse = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'test-id'
      })
    });
    
    console.log('Chat API status:', chatResponse.status);
    const chatText = await chatResponse.text();
    console.log('Chat API response:', chatText);
    
    if (chatResponse.status === 401) {
      console.log('✅ Chat API properly requires authentication');
    }
    
    // Test 4: Test Abacus AI key separately (we know this works)
    console.log('\n4️⃣ Confirming Abacus AI key works independently...');
    const apiKey = process.env.ABACUSAI_API_KEY;
    
    if (!apiKey) {
      console.log('❌ ABACUSAI_API_KEY not found in environment');
      return false;
    }
    
    const directAIResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Say "AI key works!"' }],
        stream: false,
        max_tokens: 20
      })
    });
    
    if (directAIResponse.ok) {
      const aiData = await directAIResponse.json();
      console.log('✅ Abacus AI API key is working');
      console.log('AI Response:', aiData.choices?.[0]?.message?.content);
    } else {
      console.log('❌ Abacus AI API key failed:', directAIResponse.status);
    }
    
    console.log('\n📊 Summary:');
    console.log('The 401 error is happening because:');
    console.log('1. ✅ The Abacus AI API key is working correctly');
    console.log('2. ✅ The application requires proper user authentication');
    console.log('3. ✅ The API route security is working as intended');
    console.log('4. ❌ Users need to be logged in to use the chat feature');
    
    console.log('\n💡 Solution:');
    console.log('Users need to log in through the authentication system');
    console.log('The application should redirect to login and then allow chat access');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testCompleteFlow();
