
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const abacusApiKey = process.env.ABACUSAI_API_KEY;

console.log('🔍 AUTHENTICATION PATH DIAGNOSIS');
console.log('================================');

async function diagnoseAuthPath() {
  console.log('\n1. ENVIRONMENT VALIDATION');
  console.log('Supabase URL:', supabaseUrl ? '✅ Present' : '❌ Missing');
  console.log('Supabase Anon Key:', supabaseAnonKey ? '✅ Present' : '❌ Missing');
  console.log('Abacus API Key:', abacusApiKey ? '✅ Present' : '❌ Missing');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('\n2. USER AUTHENTICATION TEST');
  
  // Try to sign in with multiple possible credentials
  let signInData, signInError;
  const credentialOptions = [
    { email: 'gene@tin.info', password: 'genepass123' },
    { email: 'admin@tin.info', password: 'admin123' },
    { email: 'john@doe.com', password: 'johndoe123' },
    { email: 'demo@example.com', password: 'demo123' }
  ];

  for (const credentials of credentialOptions) {
    console.log(`Trying to sign in with ${credentials.email}...`);
    const result = await supabase.auth.signInWithPassword(credentials);
    
    if (!result.error) {
      signInData = result.data;
      signInError = null;
      console.log(`✅ Successfully signed in with ${credentials.email}`);
      break;
    } else {
      console.log(`❌ Failed with ${credentials.email}:`, result.error.message);
    }
  }

  if (!signInData) {
    signInError = { message: 'All credential options failed' };
  }

  if (signInError) {
    console.error('❌ Failed to sign in:', signInError.message);
    return;
  }

  console.log('✅ User signed in successfully');
  console.log('User ID:', signInData.user.id);
  console.log('Email:', signInData.user.email);
  console.log('Session token present:', !!signInData.session.access_token);

  // Get the session cookies that would be sent to the server
  const sessionCookies = await supabase.auth.getSession();
  console.log('\n3. SESSION VALIDATION');
  console.log('Session valid:', !!sessionCookies.data.session);
  console.log('Access token length:', sessionCookies.data.session?.access_token.length || 0);

  console.log('\n4. TENANT RELATIONSHIP CHECK');
  const { data: tenantUser, error: tenantError } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', signInData.user.id)
    .single();

  if (tenantError) {
    console.error('❌ Tenant lookup error:', tenantError.message);
  } else {
    console.log('✅ Tenant found:', tenantUser.tenant_id);
  }

  console.log('\n5. SIMULATE SERVER-SIDE SESSION VALIDATION');
  
  // This simulates what happens in the API route
  try {
    // Get cookies that would be sent to server
    const cookieHeader = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token=${sessionCookies.data.session.access_token}`;
    console.log('Cookie header (first 50 chars):', cookieHeader.substring(0, 50) + '...');

    // Test the actual chat API endpoint
    console.log('\n6. LIVE API ENDPOINT TEST');
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello, this is a test' }],
        conversationId: 'test-conversation-id'
      })
    });

    console.log('API Response Status:', chatResponse.status);
    console.log('API Response Headers:', Object.fromEntries(chatResponse.headers.entries()));
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.log('❌ API Response Error:', errorText);
      
      if (chatResponse.status === 401) {
        console.log('\n🎯 IDENTIFIED: 401 Unauthorized from API route');
        console.log('This means the server-side session validation is failing');
      }
    } else {
      console.log('✅ API call successful');
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }

  console.log('\n7. CLEANUP');
  await supabase.auth.signOut();
  console.log('✅ Signed out successfully');
}

console.log('\nStarting comprehensive authentication diagnosis...\n');
diagnoseAuthPath().catch(console.error);
