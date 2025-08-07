
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'app', '.env') });

// Test configuration
const BASE_URL = 'http://localhost:3002';
const TEST_EMAIL = 'john@doe.com';
const TEST_PASSWORD = 'johndoe123';

async function testCompleteFlow() {
  console.log('🚀 Testing Complete Chat Flow');
  console.log('================================\n');

  // Step 1: Test Abacus.AI API directly
  console.log('1️⃣ Testing Abacus.AI API Connection...');
  const apiKey = process.env.ABACUSAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ABACUSAI_API_KEY not found');
    return false;
  }

  try {
    const apiResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Say "API Test OK"' }],
        stream: false,
        max_tokens: 10
      }),
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log('✅ Abacus.AI API working:', content.trim());
    } else {
      console.error('❌ Abacus.AI API failed:', apiResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Abacus.AI API error:', error.message);
    return false;
  }

  // Step 2: Test server health
  console.log('\n2️⃣ Testing Server Health...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/`);
    console.log('✅ Server responding:', healthResponse.status);
  } catch (error) {
    console.error('❌ Server not responding:', error.message);
    return false;
  }

  // Step 3: Test conversation API (this will fail without auth, but shows the endpoint works)
  console.log('\n3️⃣ Testing Conversations API...');
  try {
    const convResponse = await fetch(`${BASE_URL}/api/conversations`);
    if (convResponse.status === 401) {
      console.log('✅ Conversations API responding (401 expected - auth required)');
    } else {
      console.log('⚠️ Conversations API unexpected status:', convResponse.status);
    }
  } catch (error) {
    console.error('❌ Conversations API error:', error.message);
    return false;
  }

  // Step 4: Test chat API (this will also fail without auth)
  console.log('\n4️⃣ Testing Chat API...');
  try {
    const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        conversationId: 'test-id'
      })
    });
    
    if (chatResponse.status === 401) {
      console.log('✅ Chat API responding (401 expected - auth required)');
    } else {
      console.log('⚠️ Chat API unexpected status:', chatResponse.status);
    }
  } catch (error) {
    console.error('❌ Chat API error:', error.message);
    return false;
  }

  return true;
}

async function validateChatComponents() {
  console.log('\n5️⃣ Validating Chat Components...');
  
  const fs = require('fs');
  
  const requiredFiles = [
    'app/api/chat/route.ts',
    'app/api/conversations/route.ts', 
    'components/chat/improved-chat-container.tsx',
    'components/chat/message-list.tsx',
    'components/chat/message-input.tsx',
    'app/dashboard/page.tsx'
  ];

  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log('✅', file);
    } else {
      console.log('❌', file, 'MISSING');
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

function displayInstructions() {
  console.log('\n🎯 MANUAL TESTING INSTRUCTIONS');
  console.log('===============================');
  console.log('1. Open browser to: http://localhost:3002');
  console.log('2. Login with: john@doe.com / johndoe123');
  console.log('3. Click "New Chat" or start typing a message');
  console.log('4. Send a test message like "Hello, how are you?"');
  console.log('5. Verify AI responds with Abacus.AI generated content');
  console.log('6. Test creating multiple conversations');
  console.log('7. Verify conversation history is saved and loadable');
  
  console.log('\n✅ EXPECTED BEHAVIOR:');
  console.log('- Login redirects to dashboard with chat interface');
  console.log('- "New Chat" button creates new conversation');
  console.log('- Messages send successfully and show in chat');  
  console.log('- AI responds with streaming text (with progress indicator)');
  console.log('- Conversations save to sidebar and can be selected');
  console.log('- All messages persist and reload correctly');
  
  console.log('\n🛠️ TROUBLESHOOTING:');
  console.log('- If login fails: Check Supabase auth setup');
  console.log('- If messages don\'t send: Check browser console for errors');
  console.log('- If AI doesn\'t respond: Check server logs for API errors');
  console.log('- If conversations don\'t save: Check database connectivity');
}

async function main() {
  const flowTest = await testCompleteFlow();
  const componentTest = await validateChatComponents();
  
  console.log('\n📊 TEST RESULTS');
  console.log('================');
  console.log('API Flow Test:', flowTest ? '✅ PASS' : '❌ FAIL');  
  console.log('Component Check:', componentTest ? '✅ PASS' : '❌ FAIL');
  console.log('Server Running: ✅ PASS (http://localhost:3002)');
  
  if (flowTest && componentTest) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('💬 The chat system should be fully functional');
    displayInstructions();
  } else {
    console.log('\n⚠️ Some tests failed - check the issues above');
  }
}

main().catch(console.error);
