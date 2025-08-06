
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Debugging Conversation API Issues\n');

async function runDiagnostics() {
  console.log('=== ENVIRONMENT CHECK ===');
  console.log('Supabase URL:', url);
  console.log('Anon Key (first 20 chars):', anonKey?.substring(0, 20));
  console.log('Service Key available:', serviceKey ? 'Yes' : 'No');
  console.log('');

  // Test with service role (should work)
  console.log('=== DATABASE CONNECTION TEST ===');
  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Test basic connection
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .limit(1);

    if (tenantError) {
      console.log('❌ Basic connection failed:', tenantError.message);
      return;
    }

    console.log('✅ Connected to Supabase');
    console.log('Demo tenant found:', tenants?.length > 0 ? 'Yes' : 'No');
    
    if (tenants?.length > 0) {
      console.log('Demo tenant details:', {
        id: tenants[0].id,
        name: tenants[0].name,
        subdomain: tenants[0].subdomain
      });
    }

  } catch (err) {
    console.log('❌ Connection test failed:', err.message);
    return;
  }

  // Test table existence
  console.log('\n=== TABLE EXISTENCE CHECK ===');
  
  const tables = ['conversations', 'messages', 'tenant_users'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ ${table} table:`, error.message);
      } else {
        console.log(`✅ ${table} table: exists`);
      }
    } catch (err) {
      console.log(`❌ ${table} table:`, err.message);
    }
  }

  // Test tenant_users relationship
  console.log('\n=== TENANT-USER RELATIONSHIP CHECK ===');
  
  try {
    const { data: tenantUsers, error: tuError } = await supabaseAdmin
      .from('tenant_users')
      .select('*')
      .limit(5);

    if (tuError) {
      console.log('❌ Tenant users query failed:', tuError.message);
    } else {
      console.log('✅ Tenant users found:', tenantUsers?.length || 0);
      if (tenantUsers?.length > 0) {
        console.log('Sample tenant user:', {
          tenant_id: tenantUsers[0].tenant_id,
          user_id: tenantUsers[0].user_id,
          role: tenantUsers[0].role
        });
      }
    }
  } catch (err) {
    console.log('❌ Tenant users check failed:', err.message);
  }

  // Test conversation creation directly
  console.log('\n=== DIRECT CONVERSATION CREATION TEST ===');
  
  try {
    const { data: firstTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .limit(1)
      .single();

    const { data: firstTenantUser } = await supabaseAdmin
      .from('tenant_users')
      .select('user_id, tenant_id')
      .eq('tenant_id', firstTenant.id)
      .limit(1)
      .single();

    if (firstTenant && firstTenantUser) {
      const testConversation = {
        tenant_id: firstTenantUser.tenant_id,
        user_id: firstTenantUser.user_id,
        title: 'Debug Test Conversation'
      };

      console.log('Attempting to create conversation with:', testConversation);

      const { data: newConv, error: createError } = await supabaseAdmin
        .from('conversations')
        .insert(testConversation)
        .select()
        .single();

      if (createError) {
        console.log('❌ Direct conversation creation failed:', createError.message);
        console.log('Error code:', createError.code);
        console.log('Full error:', createError);
      } else {
        console.log('✅ Conversation created successfully:', newConv.id);
        
        // Test message creation
        const testMessage = {
          conversation_id: newConv.id,
          role: 'user',
          content: 'Debug test message'
        };

        const { data: newMsg, error: msgError } = await supabaseAdmin
          .from('messages')
          .insert(testMessage)
          .select()
          .single();

        if (msgError) {
          console.log('❌ Message creation failed:', msgError.message);
        } else {
          console.log('✅ Message created successfully:', newMsg.id);
        }
      }
    } else {
      console.log('❌ No tenant or tenant user found for testing');
    }

  } catch (err) {
    console.log('❌ Direct creation test failed:', err.message);
  }
}

// Test API endpoint simulation
async function testApiEndpoint() {
  console.log('\n=== API ENDPOINT SIMULATION ===');
  
  try {
    const supabaseClient = createClient(url, anonKey);
    
    // Mock user session - This would normally come from NextAuth
    const mockUser = {
      id: 'test-user-id',
    };

    console.log('Testing API logic with mock user...');
    
    // This simulates what happens in the API
    const { data: tenantUser, error: tenantError } = await supabaseClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', mockUser.id)
      .single();

    if (tenantError) {
      console.log('❌ Tenant lookup failed (this is expected for mock user):', tenantError.message);
    } else {
      console.log('✅ Tenant found for mock user');
    }

  } catch (err) {
    console.log('❌ API simulation failed:', err.message);
  }
}

// Main execution
async function main() {
  await runDiagnostics();
  await testApiEndpoint();
  
  console.log('\n=== NEXT STEPS ===');
  console.log('1. Run the SQL script "create_tables_manually.sql" in Supabase SQL Editor');
  console.log('2. Ensure you have a valid user session when testing the API');
  console.log('3. Verify that tenant_users relationships exist for your test users');
  console.log('4. Check the browser console and server logs when testing');
  
  console.log('\n=== MANUAL SQL EXECUTION ===');
  console.log('If tables are missing, copy and run this SQL in Supabase Dashboard:');
  console.log('📄 File: create_tables_manually.sql');
  console.log('🔗 Go to: https://supabase.com/dashboard/project/zddulwamthwhgxdmihny/sql');
}

main().catch(console.error);
