
// Simple test for conversation creation
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testConversationCreation() {
  console.log('Testing Conversation Creation API Flow');
  console.log('======================================\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const userId = 'a5fd006f-7e4f-4c8f-ae59-19fb7c4bfb3e'; // demo@example.com
  
  console.log('1. Testing tenant lookup...');
  const { data: tenantUser, error: tenantError } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .single();
  
  if (tenantError) {
    console.log('❌ Tenant lookup failed:', tenantError.message);
    return false;
  }
  
  console.log('✅ Tenant found:', tenantUser.tenant_id);
  
  console.log('\n2. Testing conversation creation...');
  const { data: conversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      tenant_id: tenantUser.tenant_id,
      user_id: userId,
      title: 'Simple API Test',
      metadata: {}
    })
    .select()
    .single();
  
  if (createError) {
    console.log('❌ Conversation creation failed:', createError.message);
    console.log('Error code:', createError.code);
    return false;
  }
  
  console.log('✅ Conversation created:', conversation.id);
  
  console.log('\n3. Testing conversation retrieval...');
  const { data: conversations, error: getError } = await supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantUser.tenant_id)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  if (getError) {
    console.log('❌ Conversation retrieval failed:', getError.message);
    return false;
  }
  
  console.log('✅ Retrieved', conversations.length, 'conversations');
  
  // Cleanup
  await supabase.from('conversations').delete().eq('id', conversation.id);
  console.log('✅ Test data cleaned up');
  
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('The API flow is working correctly.');
  
  return true;
}

testConversationCreation().catch(console.error);
