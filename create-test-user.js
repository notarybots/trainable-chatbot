
// Create test user in Supabase Auth
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('Creating test user...');
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testEmail = 'demo@example.com';
  const testPassword = 'demo123';
  
  try {
    // Create user using admin API
    const { data, error } = await supabase.auth.admin.createUser({
      id: testUserId,
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: 'Demo User' },
      app_metadata: { role: 'user' }
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ User already exists:', testEmail);
        return true;
      } else {
        console.log('❌ Error creating user:', error.message);
        return false;
      }
    }
    
    console.log('✅ User created successfully:');
    console.log('   ID:', data.user.id);
    console.log('   Email:', data.user.email);
    
    // Ensure tenant-user relationship exists
    const { data: demoTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', 'demo')
      .single();
    
    if (demoTenant) {
      const { error: relationError } = await supabase
        .from('tenant_users')
        .upsert({ 
          tenant_id: demoTenant.id, 
          user_id: testUserId, 
          role: 'user' 
        }, {
          onConflict: 'tenant_id,user_id'
        });
      
      if (!relationError) {
        console.log('✅ Tenant-user relationship ensured');
      } else {
        console.log('⚠️ Tenant-user relationship error:', relationError.message);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    return false;
  }
}

async function createAdditionalTestUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const adminUserId = '550e8400-e29b-41d4-a716-446655440001';
  const adminEmail = 'test@example.com';
  const adminPassword = 'demo123';
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      id: adminUserId,
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: 'Test Admin' },
      app_metadata: { role: 'admin' }
    });
    
    if (error && !error.message.includes('already exists')) {
      console.log('⚠️ Error creating admin user:', error.message);
      return false;
    }
    
    if (!error) {
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Ensure admin tenant-user relationship exists
    const { data: demoTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', 'demo')
      .single();
    
    if (demoTenant) {
      const { error: relationError } = await supabase
        .from('tenant_users')
        .upsert({ 
          tenant_id: demoTenant.id, 
          user_id: adminUserId, 
          role: 'admin' 
        }, {
          onConflict: 'tenant_id,user_id'
        });
      
      if (!relationError) {
        console.log('✅ Admin tenant-user relationship ensured');
      }
    }
    
    return true;
  } catch (error) {
    console.log('⚠️ Error with admin user:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 CREATING TEST USERS');
  console.log('=======================\n');
  
  const success1 = await createTestUser();
  const success2 = await createAdditionalTestUser();
  
  if (success1) {
    console.log('\n✅ Test users setup complete!');
    console.log('\nTest Credentials:');
    console.log('  Email: demo@example.com');
    console.log('  Password: demo123');
    console.log('  Role: user');
    console.log('\nAdmin Credentials:');
    console.log('  Email: test@example.com'); 
    console.log('  Password: demo123');
    console.log('  Role: admin');
  } else {
    console.log('\n❌ Failed to create test users');
  }
  
  process.exit(success1 ? 0 : 1);
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
