
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

async function testAuthSystem() {
  console.log('🔐 AUTHENTICATION SYSTEM TEST');
  console.log('==============================\n');

  console.log('1. ENVIRONMENT VARIABLES');
  console.log('------------------------');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}`);
  console.log(`ANON_KEY: ${supabaseAnonKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ Present' : '❌ Missing'}\n`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing required Supabase environment variables');
    return;
  }

  // Test Supabase connection with anon key
  console.log('2. SUPABASE CONNECTION TEST');
  console.log('---------------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test basic connection
    console.log('Testing connection with anon key...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log(`Connection test result: ${error.message}`);
    } else {
      console.log('✅ Supabase connection successful');
    }

    // Test getting current user (should be null when not authenticated)
    console.log('\nTesting user session (should be null)...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log(`User: ${user ? user.email : 'null'}`);
    console.log(`User error: ${userError ? userError.message : 'none'}`);
    
  } catch (error) {
    console.log('❌ Supabase client error:', error.message);
  }

  // Test with service role key
  console.log('\n3. SERVICE ROLE KEY TEST');
  console.log('------------------------');
  
  if (serviceRoleKey) {
    try {
      const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);
      
      // Test service role access
      console.log('Testing service role key access...');
      const { data: users, error } = await serviceSupabase.from('users').select('id, email').limit(5);
      
      if (error) {
        console.log(`Service role error: ${error.message}`);
      } else {
        console.log(`✅ Service role access successful`);
        console.log(`Found ${users?.length || 0} users in database`);
        
        if (users && users.length > 0) {
          console.log('Sample users:');
          users.forEach(user => {
            console.log(`  - ${user.email} (${user.id})`);
          });
        }
      }

      // Test tenant_users table
      console.log('\nTesting tenant_users table...');
      const { data: tenantUsers, error: tenantError } = await serviceSupabase.from('tenant_users').select('*').limit(5);
      
      if (tenantError) {
        console.log(`Tenant users error: ${tenantError.message}`);
      } else {
        console.log(`✅ Tenant users table accessible`);
        console.log(`Found ${tenantUsers?.length || 0} tenant-user relationships`);
      }
      
    } catch (error) {
      console.log('❌ Service role client error:', error.message);
    }
  } else {
    console.log('❌ Service role key not available');
  }

  console.log('\n4. TEST USER LOGIN');
  console.log('------------------');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Try to sign in with the demo credentials
    console.log('Attempting login with demo credentials...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@tin.info',
      password: 'admin123'
    });
    
    if (error) {
      console.log(`❌ Login failed: ${error.message}`);
    } else {
      console.log('✅ Login successful!');
      console.log(`User: ${data.user?.email}`);
      console.log(`Session exists: ${!!data.session}`);
      
      // Test API call with session
      console.log('\nTesting authenticated API call...');
      
      // Note: This won't work in Node.js the same way as browser, but we can test the concept
      console.log('Session token preview:', data.session?.access_token?.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.log('❌ Login test error:', error.message);
  }

  console.log('\n==============================');
  console.log('AUTHENTICATION TEST COMPLETE');
  console.log('==============================');
}

testAuthSystem().catch(console.error);
