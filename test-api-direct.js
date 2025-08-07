
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

async function testAPI() {
  console.log('🔍 DIRECT API TESTING');
  console.log('=====================\n');

  // Test environment variables
  console.log('1. ENVIRONMENT CHECK');
  console.log('-------------------');
  const apiKey = process.env.ABACUSAI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log(`ABACUSAI_API_KEY: ${apiKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}`);
  console.log(`SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Present' : '❌ Missing'}\n`);

  // Test Abacus AI API directly
  console.log('2. ABACUS AI API TEST');
  console.log('--------------------');
  
  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Hello, test message' }],
        max_tokens: 50,
        temperature: 0.7
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Abacus AI API working');
      console.log(`Response: ${JSON.stringify(data).substring(0, 100)}...\n`);
    } else {
      const errorText = await response.text();
      console.log('❌ Abacus AI API error:');
      console.log(errorText + '\n');
    }
  } catch (error) {
    console.log('❌ Abacus AI API connection failed:');
    console.log(error.message + '\n');
  }

  // Test local API endpoint without auth
  console.log('3. LOCAL API ENDPOINT TEST (No Auth)');
  console.log('------------------------------------');
  
  try {
    const response = await fetch('http://localhost:3000/api/test-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const data = await response.text();
    console.log(`Response: ${data}\n`);
  } catch (error) {
    console.log('❌ Local API connection failed:');
    console.log(error.message + '\n');
  }

  // Test Supabase client
  console.log('4. SUPABASE CLIENT TEST');
  console.log('-----------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Try to get session (should be null when not authenticated)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('User session:');
    console.log(`- User: ${user ? user.email : 'null'}`);
    console.log(`- Error: ${error ? error.message : 'none'}\n`);

  } catch (error) {
    console.log('❌ Supabase client error:');
    console.log(error.message + '\n');
  }

  console.log('=====================');
  console.log('TESTING COMPLETE');
  console.log('=====================');
}

// Only run if this script is called directly
if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = testAPI;
