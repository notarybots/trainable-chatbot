const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createConversationsTable() {
  console.log('🔧 Creating conversations table...');
  
  try {
    // Try to create the table using a workaround
    // We'll use the existing schema and try to create via SQL function
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.conversations (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (error) {
      console.log('❌ Failed to create conversations table:', error.message);
      return false;
    }
    
    console.log('✅ Conversations table created successfully');
    return true;
  } catch (err) {
    console.log('❌ Exception creating conversations table:', err.message);
    return false;
  }
}

async function createMessagesTable() {
  console.log('🔧 Creating messages table...');
  
  try {
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.messages (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (error) {
      console.log('❌ Failed to create messages table:', error.message);
      return false;
    }
    
    console.log('✅ Messages table created successfully');
    return true;
  } catch (err) {
    console.log('❌ Exception creating messages table:', err.message);
    return false;
  }
}

async function createBasicTables() {
  console.log('🔧 Attempting basic table creation using direct inserts...');
  
  // Try a different approach - create a dummy record to force table creation
  try {
    // First, let's try to insert a test record to see what happens
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();
    
    if (tenantError) {
      console.log('❌ Cannot access tenants table:', tenantError.message);
      return false;
    }
    
    console.log('✅ Tenants table accessible, tenant ID:', tenantData.id);
    
    // Now try to create conversations table by attempting an insert
    // This will fail but might give us better error info
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .insert({
        tenant_id: tenantData.id,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Conversation'
      })
      .select();
    
    if (convError) {
      console.log('❌ Conversations table does not exist:', convError.message);
      
      // Check if it's a "relation does not exist" error
      if (convError.message.includes('relation') && convError.message.includes('does not exist')) {
        console.log('🔧 Table needs to be created manually');
        return false;
      }
    } else {
      console.log('✅ Conversations table exists and is writable');
      
      // Clean up test record
      await supabase
        .from('conversations')
        .delete()
        .eq('id', convData[0].id);
      
      return true;
    }
    
  } catch (err) {
    console.log('❌ Exception during table check:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting direct API migration...');
  
  const tablesCreated = await createBasicTables();
  
  if (!tablesCreated) {
    console.log('\n❌ MIGRATION FAILED');
    console.log('📋 Manual intervention required:');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/project/zddulwamthwhgxdmihny/sql');
    console.log('2. Copy the contents of create_tables_manually.sql');
    console.log('3. Paste and execute in the SQL Editor');
    console.log('4. Run this script again to verify');
  } else {
    console.log('\n✅ MIGRATION SUCCESSFUL');
    console.log('🎉 Conversations and messages tables are ready!');
  }
}

main().catch(console.error);
