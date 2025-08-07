
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

// Create clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('🧪 LIVE SESSION API TEST');
console.log('========================');

async function testLiveAPI() {
  console.log('\n1. SIGNING IN...');
  
  // Sign in to get a real session
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@tin.info',
    password: 'admin123'
  });
  
  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    return;
  }
  
  console.log('✅ Signed in:', authData.user.email);
  
  console.log('\n2. GETTING SESSION...');
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  
  if (!accessToken) {
    console.error('❌ No access token found');
    return;
  }
  
  console.log('✅ Got access token (length):', accessToken.length);
  
  console.log('\n3. TESTING API WITH PROPER COOKIE...');
  
  // Test with different cookie formats
  const cookieFormats = [
    `sb-zddulwamthwhgxdmihny-auth-token=${accessToken}`,
    `sb-zddulwamthwhgxdmihny-auth-token.0=${accessToken}`,
    `sb-zddulwamthwhgxdmihny-auth-token-signed=${accessToken}`
  ];
  
  for (let i = 0; i < cookieFormats.length; i++) {
    const cookieHeader = cookieFormats[i];
    console.log(`\nTesting format ${i + 1}:`, cookieHeader.substring(0, 80) + '...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello API test' }],
        conversationId: 'test-conversation'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    } else if (response.status === 200) {
      console.log('✅ SUCCESS! API call worked');
      // Don't read the streaming response, just confirm it worked
      break;
    } else {
      const text = await response.text();
      console.log('Other response:', text.substring(0, 200));
    }
  }
  
  console.log('\n4. TESTING DIRECT SERVER ENDPOINT...');
  
  // Test server health
  try {
    const healthResponse = await fetch('http://localhost:3000/', {
      method: 'GET'
    });
    console.log('Server health check:', healthResponse.status);
  } catch (e) {
    console.log('❌ Server not responding:', e.message);
  }
  
  console.log('\n5. CLEANUP...');
  await supabase.auth.signOut();
  console.log('✅ Signed out');
}

testLiveAPI().catch(console.error);
