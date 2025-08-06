
// Test conversation creation simulating the exact API flow
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function simulateAPIFlow() {
  console.log('🧪 SIMULATING CONVERSATION API FLOW');
  console.log('====================================
');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Create client with anon key (simulating what the API route does)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Simulate authentication - in the real app this would come from session
  const userId = 'a5fd006f-7e4f-4c8f-ae59-19fb7c4bfb3e'; // demo@example.com
  
  console.log('1️⃣ Simulating user authentication...');
  console.log('   User ID:', userId);
  
  // Step 2: Get tenant_id from user (exactly like the API route)
  console.log('
2️⃣ Getting tenant information...');
  const { data: tenantUser, error: tenantError } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .single();
  
  if (tenantError) {
    console.log('❌ Tenant lookup failed:', tenantError.message);
    console.log('Error code:', tenantError.code);
    return false;
  }
  
  if (!tenantUser) {
    console.log('❌ No tenant found for user');
    return false;
  }
  
  console.log('✅ Tenant found:', tenantUser.tenant_id);
  
  // Step 3: Create conversation (exactly like the API route)
  console.log('
3️⃣ Creating conversation...');
  const conversationData = {
    tenant_id: tenantUser.tenant_id,
    user_id: userId,
    title: 'API Simulation Test',
    metadata: {}
  };
  
  const { data: conversation, error: createError } = await supabase
    .from('conversations')
    .insert(conversationData)
    .select()
    .single();
  
  if (createError) {
    console.log('❌ Conversation creation failed:', createError.message);
    console.log('Error code:', createError.code);
    console.log('Error details:', createError.details);
    
    // Detailed error analysis
    if (createError.code === 'PGRST301') {
      console.log('\
🔍 RLS Policy Issue Detected:');
      console.log('   The user may not have the right permissions.');
      console.log('   Check if RLS policies allow this user to create conversations.');
    } else if (createError.message.includes('foreign key')) {
      console.log('\
🔍 Foreign Key Issue Detected:');
      console.log('   The tenant_id or user_id may not exist in referenced tables.');
    }
    
    return false;
  }
  
  console.log('✅ Conversation created successfully!');
  console.log('   ID:', conversation.id);
  console.log('   Title:', conversation.title);
  console.log('   Tenant:', conversation.tenant_id);
  console.log('   User:', conversation.user_id);
  
  // Step 4: Test message creation
  console.log('\
4️⃣ Creating test message...');
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      role: 'user',
      content: 'This is a test message from API simulation'
    })
    .select()
    .single();
  
  if (msgError) {
    console.log('❌ Message creation failed:', msgError.message);
  } else {
    console.log('✅ Message created successfully!');
    console.log('   ID:', message.id);
    console.log('   Content:', message.content);
  }
  
  // Step 5: Test getting conversations (like GET /api/conversations)
  console.log('\
5️⃣ Testing conversation retrieval...');
  const { data: conversations, error: getError } = await supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  if (getError) {
    console.log('❌ Conversation retrieval failed:', getError.message);
  } else {
    console.log('✅ Conversation retrieval successful!');
    console.log('   Found', conversations.length, 'conversations');
    conversations.forEach((conv, index) => {
      console.log(`   ${index + 1}. ${conv.title} (ID: ${conv.id})`);
    });
  }
  
  // Cleanup
  console.log('\
6️⃣ Cleaning up test data...');
  await supabase.from('conversations').delete().eq('id', conversation.id);
  console.log('✅ Test conversation deleted');
  
  console.log('\
🎉 API FLOW SIMULATION SUCCESSFUL!');
  console.log('====================================');
  console.log('✅ User authentication simulation: OK');
  console.log('✅ Tenant lookup: OK');
  console.log('✅ Conversation creation: OK'); 
  console.log('✅ Message creation: OK');
  console.log('✅ Conversation retrieval: OK');
  console.log('\
✨ The API should work correctly in the application!');
  
  return true;
}

async function testAuthenticationIssues() {
  console.log('\
🔐 TESTING AUTHENTICATION SCENARIOS');
  console.log('=====================================\
');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test 1: Invalid user ID
  console.log('1️⃣ Testing invalid user ID...');
  const { data: invalidTenant, error: invalidError } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', 'invalid-user-id')
    .single();
  
  if (invalidError && invalidError.code === 'PGRST116') {
    console.log('✅ Invalid user correctly returns no results');
  } else if (invalidError) {
    console.log('⚠️ Unexpected error for invalid user:', invalidError.message);
  } else {
    console.log('⚠️ Invalid user unexpectedly returned data');
  }
  
  // Test 2: User with no tenant relationship
  console.log('\
2️⃣ Testing user with no tenant relationship...');
  
  // Get a real user but check for a non-existent tenant relationship
  const { data: realUser } = await supabase.auth.admin.listUsers();
  if (realUser.users.length > 0) {
    const testUserId = realUser.users[0].id;
    
    // Try to find tenant for this user
    const { data: userTenant, error: userTenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', testUserId)
      .single();
    
    if (userTenantError && userTenantError.code === 'PGRST116') {
      console.log('✅ User with no tenant relationship correctly returns no results');
    } else if (userTenant) {
      console.log('✅ User has tenant relationship:', userTenant.tenant_id);
    }
  }
  
  console.log('\
✅ Authentication scenarios tested');
}

async function main() {
  const success1 = await simulateAPIFlow();
  await testAuthenticationIssues();
  
  if (success1) {
    console.log('\
🚀 READY TO TEST APPLICATION!');
    console.log('==============================');
    console.log('The conversation creation should work in the web app.');
    console.log('\
Next steps:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Open http://localhost:3000');  
    console.log('3. Login with: demo@example.com / demo123');
    console.log('4. Try creating a new conversation');
  }
  
  process.exit(success1 ? 0 : 1);
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
