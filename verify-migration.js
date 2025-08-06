const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTables() {
  console.log('🔍 Verifying database migration...');
  
  let allGood = true;
  
  // Check conversations table
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, tenant_id, user_id, title, created_at')
      .limit(5);
    
    if (error) {
      console.log('❌ Conversations table: NOT ACCESSIBLE');
      console.log('   Error:', error.message);
      allGood = false;
    } else {
      console.log('✅ Conversations table: ACCESSIBLE');
      console.log(`   Found ${data.length} existing conversations`);
    }
  } catch (err) {
    console.log('❌ Conversations table: ERROR');
    console.log('   Exception:', err.message);
    allGood = false;
  }
  
  // Check messages table
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at')
      .limit(5);
    
    if (error) {
      console.log('❌ Messages table: NOT ACCESSIBLE');
      console.log('   Error:', error.message);
      allGood = false;
    } else {
      console.log('✅ Messages table: ACCESSIBLE');
      console.log(`   Found ${data.length} existing messages`);
    }
  } catch (err) {
    console.log('❌ Messages table: ERROR');
    console.log('   Exception:', err.message);
    allGood = false;
  }
  
  // Test conversation creation
  if (allGood) {
    console.log('\n🧪 Testing conversation creation...');
    
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', 'demo')
        .single();
      
      if (tenant) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            tenant_id: tenant.id,
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Migration Test Conversation'
          })
          .select()
          .single();
        
        if (convError) {
          console.log('❌ Conversation creation: FAILED');
          console.log('   Error:', convError.message);
          allGood = false;
        } else {
          console.log('✅ Conversation creation: SUCCESS');
          console.log('   Created conversation ID:', newConv.id);
          
          // Test message creation
          const { data: newMsg, error: msgError } = await supabase
            .from('messages')
            .insert({
              conversation_id: newConv.id,
              role: 'user',
              content: 'Test message for migration verification'
            })
            .select()
            .single();
          
          if (msgError) {
            console.log('❌ Message creation: FAILED');
            console.log('   Error:', msgError.message);
            allGood = false;
          } else {
            console.log('✅ Message creation: SUCCESS');
            console.log('   Created message ID:', newMsg.id);
            
            // Clean up test data
            await supabase.from('messages').delete().eq('id', newMsg.id);
            await supabase.from('conversations').delete().eq('id', newConv.id);
            console.log('🧹 Test data cleaned up');
          }
        }
      }
    } catch (err) {
      console.log('❌ Test creation: ERROR');
      console.log('   Exception:', err.message);
      allGood = false;
    }
  }
  
  return allGood;
}

async function main() {
  console.log('🚀 MIGRATION VERIFICATION SCRIPT');
  console.log('================================\n');
  
  const success = await verifyTables();
  
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 MIGRATION VERIFICATION: SUCCESS!');
    console.log('✅ All tables are properly created and functional');
    console.log('✅ Conversations and messages can be created');
    console.log('✅ The chatbot should now work without "Failed to create new conversation" error');
  } else {
    console.log('❌ MIGRATION VERIFICATION: FAILED');
    console.log('⚠️  Some tables or functionality are missing');
    console.log('📋 Please ensure the SQL migration was executed properly');
  }
  console.log('='.repeat(50));
}

main().catch(console.error);
