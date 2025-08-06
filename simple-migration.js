const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Checking existing tables...');
  
  // Check if conversations table exists
  const { data: convData, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .limit(1);
  
  console.log('Conversations table check:', convError ? 'DOES NOT EXIST' : 'EXISTS');
  
  // Check if messages table exists
  const { data: msgData, error: msgError } = await supabase
    .from('messages')
    .select('id')
    .limit(1);
  
  console.log('Messages table check:', msgError ? 'DOES NOT EXIST' : 'EXISTS');
  
  // Check if tenants table exists
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .limit(1);
  
  console.log('Tenants table check:', tenantError ? 'DOES NOT EXIST' : 'EXISTS');
  
  if (tenantError) {
    console.log('❌ Base tables do not exist. Need to run initial schema migration first.');
    return false;
  }
  
  if (!convError && !msgError) {
    console.log('✅ Both conversations and messages tables already exist!');
    return true;
  }
  
  return false;
}

async function testConnection() {
  console.log('🔗 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    return true;
  } catch (err) {
    console.log('❌ Connection error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting simple migration check...');
  
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Cannot connect to database');
    return;
  }
  
  const tablesExist = await checkTables();
  if (tablesExist) {
    console.log('✅ Migration not needed - tables already exist');
  } else {
    console.log('⚠️  Tables need to be created manually via Supabase Dashboard');
    console.log('📋 Please copy the contents of create_tables_manually.sql');
    console.log('📋 And paste it into Supabase Dashboard > SQL Editor');
  }
}

main().catch(console.error);
