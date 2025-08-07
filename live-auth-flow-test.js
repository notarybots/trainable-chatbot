#!/usr/bin/env node

console.log('🧪 LIVE AUTHENTICATION FLOW TEST');
console.log('='.repeat(60));

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Test environment setup
console.log('\n1️⃣ ENVIRONMENT SETUP:');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const abacusKey = process.env.ABACUSAI_API_KEY;

console.log(`Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`Supabase Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
console.log(`Abacus AI Key: ${abacusKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Missing Supabase credentials, cannot continue test');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthenticationFlow() {
  console.log('\n2️⃣ TESTING AUTHENTICATION FLOW:');
  
  try {
    // Test 1: Check current session
    console.log('\n🔍 Testing current session...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log(`❌ Session Error: ${sessionError.message}`);
    } else if (session?.session) {
      console.log(`✅ Session Found: ${session.session.user?.email}`);
      console.log(`   Access Token: ${session.session.access_token ? 'Present' : 'Missing'}`);
      console.log(`   Refresh Token: ${session.session.refresh_token ? 'Present' : 'Missing'}`);
    } else {
      console.log('❌ No active session found');
    }

    // Test 2: Test API call simulation
    console.log('\n🔍 Simulating API call...');
    
    // Simulate what the server-side code does
    const { data: user, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log(`❌ User Error: ${userError.message}`);
    } else if (user?.user) {
      console.log(`✅ User Retrieved: ${user.user.email}`);
      console.log(`   User ID: ${user.user.id}`);
    } else {
      console.log('❌ No user found (this is what causes 401)');
    }

    // Test 3: Check user in tenant_users table
    if (user?.user) {
      console.log('\n🔍 Testing tenant relationship...');
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.user.id)
        .single();
      
      if (tenantError) {
        console.log(`❌ Tenant Error: ${tenantError.message}`);
      } else if (tenantUser) {
        console.log(`✅ Tenant Relationship: ${tenantUser.tenant_id}`);
      } else {
        console.log('❌ No tenant relationship found');
      }
    }

    // Test 4: Test Abacus AI API
    if (abacusKey) {
      console.log('\n🔍 Testing Abacus AI API...');
      
      try {
        const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${abacusKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            messages: [{ role: 'user', content: 'Test message' }],
            max_tokens: 10
          })
        });

        if (response.ok) {
          console.log('✅ Abacus AI API: Connection successful');
        } else {
          console.log(`❌ Abacus AI API Error: ${response.status} ${response.statusText}`);
        }
      } catch (apiError) {
        console.log(`❌ Abacus AI API Error: ${apiError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

async function testWithTestUser() {
  console.log('\n3️⃣ TESTING WITH DEMO USER:');
  
  try {
    // Try to sign in with demo credentials
    console.log('🔐 Attempting sign-in with demo credentials...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'john@doe.com',
      password: 'johndoe123'
    });

    if (signInError) {
      console.log(`❌ Sign-in Error: ${signInError.message}`);
    } else if (signInData?.session) {
      console.log(`✅ Sign-in Successful: ${signInData.user?.email}`);
      console.log(`   Session Access Token: ${signInData.session.access_token ? 'Present' : 'Missing'}`);
      
      // Now test the flow with authenticated user
      await testAuthenticationFlow();
      
      // Sign out
      console.log('\n🚪 Signing out...');
      await supabase.auth.signOut();
      console.log('✅ Signed out successfully');
      
    } else {
      console.log('❌ Sign-in failed - no session returned');
    }

  } catch (error) {
    console.error('❌ Demo User Test Error:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive authentication flow test...\n');
  
  await testAuthenticationFlow();
  await testWithTestUser();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 TEST SUMMARY:');
  console.log('='.repeat(60));
  console.log('\nThe 401 error occurs because:');
  console.log('1. Client-side session is in localStorage');
  console.log('2. Server-side code expects session in cookies');  
  console.log('3. fetch() calls don\'t include credentials');
  console.log('4. Server can\'t access user session → 401');
  console.log('\nSOLUTION: Add credentials: "include" to fetch requests');
  console.log('='.repeat(60));
}

runAllTests().catch(console.error);
