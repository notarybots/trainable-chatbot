
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Load environment variables
require('dotenv').config();

async function testSessionTransmission() {
  console.log('🔄 SESSION TRANSMISSION TEST');
  console.log('============================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing Supabase environment variables');
    return;
  }

  console.log('1. LOGIN AND GET SESSION');
  console.log('------------------------');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Sign in to get a session
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@tin.info', 
      password: 'admin123'
    });
    
    if (error) {
      console.log('❌ Login failed:', error.message);
      return;
    }
    
    console.log('✅ Login successful');
    console.log(`User: ${data.user?.email}`);
    console.log(`Session token: ${data.session?.access_token?.substring(0, 30)}...`);
    
    // Get session cookies that would be set by Supabase
    const session = data.session;
    if (!session) {
      console.log('❌ No session obtained');
      return;
    }

    console.log('\n2. SIMULATE API CALL WITH SESSION');
    console.log('---------------------------------');

    // Create the authorization header that the Supabase server client expects
    const authHeader = `Bearer ${session.access_token}`;
    
    console.log(`Authorization header: ${authHeader.substring(0, 50)}...`);

    // Simulate what would happen in a browser - create the cookies
    // that Supabase client would set
    const cookies = [
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token=${JSON.stringify({
        access_token: session.access_token,
        token_type: session.token_type,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        refresh_token: session.refresh_token,
        user: session.user
      })}`,
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token.0=${session.access_token}`,
      `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token.1=${session.refresh_token}`
    ];

    console.log('Generated cookies preview:');
    cookies.forEach((cookie, i) => {
      console.log(`  Cookie ${i + 1}: ${cookie.substring(0, 100)}...`);
    });

    console.log('\n3. ENVIRONMENT VARIABLE CHECK FOR SERVER');
    console.log('-----------------------------------------');
    
    // Let's also verify what the API route should be seeing
    console.log('API Route Environment Variables:');
    console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}`);
    console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}`);
    console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'}`);
    
    console.log('\n4. DIRECT TOKEN VALIDATION');
    console.log('---------------------------');

    // Test if we can validate the token directly
    try {
      const testSupabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Set the session manually to test validation
      await testSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      
      const { data: { user }, error: userError } = await testSupabase.auth.getUser();
      
      if (userError) {
        console.log(`❌ Token validation failed: ${userError.message}`);
      } else {
        console.log(`✅ Token validation successful: ${user?.email}`);
      }
      
    } catch (error) {
      console.log(`❌ Token validation error: ${error.message}`);
    }

  } catch (error) {
    console.log('❌ Test error:', error.message);
  }

  console.log('\n============================');
  console.log('SESSION TRANSMISSION COMPLETE');
  console.log('============================');
}

testSessionTransmission().catch(console.error);
