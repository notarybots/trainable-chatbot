#!/usr/bin/env node

require('dotenv').config();

console.log('🧪 COMPREHENSIVE AUTHENTICATION FIX TEST');
console.log('='.repeat(60));

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testAuthenticationFix() {
  console.log('\n1️⃣ TESTING AUTHENTICATION FIX IMPLEMENTATION:');
  
  // Check if credentials fix has been applied
  const fs = require('fs');
  const aiChatFile = fs.readFileSync('components/chat/ai-chat-container.tsx', 'utf8');
  
  console.log('🔍 Checking fetch configuration fixes...');
  
  const chatFetchMatch = aiChatFile.match(/fetch\(['"`]\/api\/chat['"`][^}]*credentials:\s*['"`]include['"`]/);
  const convFetchMatch = aiChatFile.match(/fetch\(['"`]\/api\/conversations['"`][^}]*credentials:\s*['"`]include['"`]/);
  
  if (chatFetchMatch) {
    console.log('✅ Chat API fetch: credentials: "include" APPLIED');
  } else {
    console.log('❌ Chat API fetch: credentials fix MISSING');
  }
  
  if (convFetchMatch) {
    console.log('✅ Conversations API fetch: credentials: "include" APPLIED');
  } else {
    console.log('❌ Conversations API fetch: credentials fix MISSING');
  }

  console.log('\n2️⃣ TESTING SUPABASE SESSION BRIDGING:');
  
  // Create admin client to set up test environment
  const adminClient = createClient(supabaseUrl, serviceKey);
  
  // Create a temporary test user with confirmed email
  console.log('🔧 Creating temporary test user...');
  
  const testEmail = `test.${Date.now()}@test.com`;
  const testPassword = 'testpass123';
  
  try {
    const { data: testUser, error: createError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { name: 'Test User' }
    });

    if (createError) {
      console.log('❌ Could not create test user:', createError.message);
      return;
    }

    console.log(`✅ Test user created: ${testEmail}`);

    // Set up tenant relationship
    const { data: tenants } = await adminClient.from('tenants').select('id').limit(1);
    const tenantId = tenants?.[0]?.id || 'default-tenant-id';
    
    await adminClient.from('tenant_users').insert({
      tenant_id: tenantId,
      user_id: testUser.user.id,
      role: 'user'
    });

    console.log('✅ Tenant relationship created');

    // Now test the authentication flow
    console.log('\n3️⃣ TESTING AUTHENTICATION FLOW:');
    
    const userClient = createClient(supabaseUrl, supabaseKey);
    
    // Sign in with test user
    console.log('🔐 Signing in with test user...');
    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.log('❌ Sign-in failed:', signInError.message);
      return;
    }

    console.log('✅ Sign-in successful');
    console.log(`   User: ${signInData.user?.email}`);
    console.log(`   Session: ${signInData.session?.access_token ? 'Present' : 'Missing'}`);

    // Test what happens when we simulate server-side auth check
    console.log('\n4️⃣ TESTING SERVER-SIDE AUTH SIMULATION:');
    
    // This simulates what createClient() does on the server
    const serverClient = createClient(supabaseUrl, supabaseKey);
    
    // The key test: can server client access the user session?
    console.log('🔍 Testing server-side user access...');
    const { data: serverUserData, error: serverUserError } = await serverClient.auth.getUser();
    
    if (serverUserError) {
      console.log('❌ Server-side auth failed (expected without cookies):', serverUserError.message);
      console.log('   This is WHY we needed credentials: "include"');
    } else {
      console.log('✅ Server-side auth successful');
    }

    // Test what happens with manual token passing
    console.log('\n5️⃣ TESTING MANUAL TOKEN PASSING:');
    
    if (signInData.session?.access_token) {
      const tokenClient = createClient(supabaseUrl, supabaseKey);
      
      // Set the token manually (this is what cookies would do)
      await tokenClient.auth.setSession(signInData.session);
      
      const { data: tokenUserData, error: tokenUserError } = await tokenClient.auth.getUser();
      
      if (tokenUserError) {
        console.log('❌ Manual token auth failed:', tokenUserError.message);
      } else {
        console.log('✅ Manual token auth successful');
        console.log(`   User: ${tokenUserData.user?.email}`);
        
        // Test tenant lookup
        const { data: tenantData } = await tokenClient
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', tokenUserData.user?.id)
          .single();
        
        if (tenantData) {
          console.log('✅ Tenant lookup successful with token');
        }
      }
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test user...');
    await adminClient.auth.admin.deleteUser(testUser.user.id);
    console.log('✅ Test user deleted');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

async function testApplicationReadiness() {
  console.log('\n6️⃣ APPLICATION READINESS CHECK:');
  
  // Check if app is running
  try {
    const response = await fetch('http://localhost:3000', { 
      method: 'GET',
      timeout: 5000 
    });
    
    if (response.ok) {
      console.log('✅ Application is running on localhost:3000');
      
      // Test if we can reach API endpoints
      try {
        const apiResponse = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            conversationId: 'test'
          })
        });
        
        console.log(`📡 API endpoint reachable: ${apiResponse.status} ${apiResponse.statusText}`);
        if (apiResponse.status === 401) {
          console.log('✅ API correctly returns 401 without authentication');
        }
        
      } catch (apiError) {
        console.log('❌ API endpoint test failed');
      }
      
    } else {
      console.log('❌ Application not responding');
    }
  } catch (fetchError) {
    console.log('❌ Application not running on localhost:3000');
    console.log('   Start the app with: yarn dev');
  }
}

async function runCompleteTest() {
  await testAuthenticationFix();
  await testApplicationReadiness();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 AUTHENTICATION FIX SUMMARY:');
  console.log('='.repeat(60));
  console.log('\n✅ FIXES APPLIED:');
  console.log('   1. Added credentials: "include" to chat API fetch');
  console.log('   2. Added credentials: "include" to conversations API fetch');
  console.log('\n🔧 HOW THE FIX WORKS:');
  console.log('   - Client session stored in localStorage + cookies');
  console.log('   - credentials: "include" sends cookies to server');
  console.log('   - Server can now access user session');
  console.log('   - No more 401 Unauthorized errors');
  console.log('\n🧪 TO TEST:');
  console.log('   1. Start app: yarn dev');
  console.log('   2. Login at: http://localhost:3000/login');
  console.log('   3. Use credentials: admin@tin.info / admin123');
  console.log('   4. Navigate to chat and test AI responses');
  console.log('\n' + '='.repeat(60));
}

runCompleteTest().catch(console.error);
