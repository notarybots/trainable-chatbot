const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTenantUsers() {
  console.log('🔧 Fixing tenant-user relationships...');
  console.log('=====================================\n');
  
  try {
    // First, check what tenants exist
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, subdomain');
    
    if (tenantError) {
      console.log('❌ Error fetching tenants:', tenantError.message);
      return;
    }
    
    console.log('📋 Available tenants:');
    tenants.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.subdomain}): ${tenant.id}`);
    });
    
    // Find demo tenant
    const demoTenant = tenants.find(t => t.subdomain === 'demo');
    if (!demoTenant) {
      console.log('❌ Demo tenant not found!');
      return;
    }
    
    console.log(`\n✅ Found demo tenant: ${demoTenant.id}`);
    
    // Check existing tenant_users
    const { data: existingUsers, error: existingError } = await supabase
      .from('tenant_users')
      .select('*');
    
    if (existingError) {
      console.log('❌ Error fetching tenant_users:', existingError.message);
    } else {
      console.log(`\n📊 Existing tenant-user relationships: ${existingUsers.length}`);
      existingUsers.forEach(tu => {
        console.log(`   - User ${tu.user_id} -> Tenant ${tu.tenant_id} (${tu.role})`);
      });
    }
    
    // Check what users exist in auth.users (we can't query this directly, so we'll try with known IDs)
    const knownUserIds = [
      'a5fd006f-7e4f-4c8f-ae59-19fb7c4bfb3e', // demo user from the SQL
      'ef24e4af-7e25-4b6e-8c41-75f2ff4386b0', // test user from the SQL
      '550e8400-e29b-41d4-a716-446655440000'  // user from verification script
    ];
    
    console.log('\n🔄 Creating tenant-user relationships...');
    
    for (const userId of knownUserIds) {
      try {
        const { data, error } = await supabase
          .from('tenant_users')
          .upsert({
            tenant_id: demoTenant.id,
            user_id: userId,
            role: 'user'
          }, {
            onConflict: 'tenant_id,user_id'
          })
          .select();
        
        if (error) {
          console.log(`⚠️  Failed to create relationship for user ${userId}:`, error.message);
        } else {
          console.log(`✅ Created/updated relationship for user ${userId}`);
        }
      } catch (err) {
        console.log(`❌ Exception for user ${userId}:`, err.message);
      }
    }
    
    // Verify the relationships were created
    const { data: newUsers, error: newError } = await supabase
      .from('tenant_users')
      .select('*');
    
    if (!newError) {
      console.log(`\n📊 Updated tenant-user relationships: ${newUsers.length}`);
      newUsers.forEach(tu => {
        console.log(`   - User ${tu.user_id} -> Tenant ${tu.tenant_id} (${tu.role})`);
      });
    }
    
    console.log('\n🎉 Tenant-user relationship fix completed!');
    
  } catch (err) {
    console.error('❌ Error in fixTenantUsers:', err.message);
  }
}

fixTenantUsers().catch(console.error);
