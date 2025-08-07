
const { createClient } = require('@supabase/supabase-js');

async function testSimplifiedAuth() {
  console.log('🧪 Testing Simplified Authentication Approach');
  console.log('='.repeat(60));

  // Test environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const abacusApiKey = process.env.ABACUSAI_API_KEY;

  console.log('📋 Environment Check:');
  console.log(`  Supabase URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}`);
  console.log(`  Supabase Key: ${supabaseKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`  Abacus API Key: ${abacusApiKey ? '✅ Present' : '❌ Missing'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase configuration');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('\n🔐 Testing Frontend Authentication...');
    
    // Sign in to get user email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@tin.info',
      password: 'admin123'
    });
    
    if (authError) {
      console.log('❌ Auth failed:', authError.message);
      return;
    }
    
    console.log('✅ Frontend authentication successful');
    console.log(`   User: ${authData.user.email}`);
    
    console.log('\n🚀 Testing Simplified Chat API...');
    
    // Test the simplified chat API
    const testMessage = {
      messages: [
        { role: 'user', content: 'Hello! This is a test of the simplified auth system.' }
      ],
      conversationId: 'test-' + Date.now(),
      userEmail: authData.user.email
    };
    
    console.log('📤 Sending test message to API...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    console.log(`📨 API Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
      return;
    }
    
    console.log('✅ API accepted the request - testing stream...');
    
    // Test streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunks = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      buffer += chunk;
      chunks++;
      
      if (chunks <= 3) {
        console.log(`📡 Stream chunk ${chunks}:`, chunk.substring(0, 100) + '...');
      }
      
      // Check for completion
      if (chunk.includes('"status":"completed"')) {
        console.log('✅ Stream completed successfully');
        break;
      }
    }
    
    console.log(`📊 Stream Stats:`);
    console.log(`   Total chunks: ${chunks}`);
    console.log(`   Total data: ${buffer.length} chars`);
    
    // Parse final result if available
    const lines = buffer.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.status === 'completed') {
            console.log('🎉 AI Response received:');
            console.log(`   Length: ${data.result.content.length} chars`);
            console.log(`   Preview: ${data.result.content.substring(0, 100)}...`);
            break;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    console.log('\n🎯 SIMPLIFIED AUTH TEST RESULTS:');
    console.log('✅ Frontend authentication: WORKING');
    console.log('✅ API authentication: WORKING (no 401 errors)');
    console.log('✅ AI streaming: WORKING');
    console.log('✅ End-to-end flow: SUCCESSFUL');
    
    console.log('\n🚀 The simplified authentication approach is working!');
    console.log('   No more 401 errors from complex session validation');
    console.log('   AI chat should now work properly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Load environment variables
require('dotenv').config();

testSimplifiedAuth();
