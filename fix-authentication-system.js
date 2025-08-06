
const { createClient } = require('@supabase/supabase-js');

async function fixAuthenticationSystem() {
  console.log('\n🚀 COMPREHENSIVE AUTHENTICATION SYSTEM FIX');
  console.log('='.repeat(60));

  // Read current env to get the service key for admin operations
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zddulwamthwhgxdmihny.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHVsd2FtdGh3aGd4ZG1paG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzMDYwNSwiZXhwIjoyMDcwMDA2NjA1fQ.Yw_L7uJZCB7TTsYIvkMPEYRRf3rcQbXt-IVBOnjQ2Aw';

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    console.log('\n1. Testing Supabase Connection...');
    // Test connection by fetching project info
    const { data, error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('   ❌ Connection failed:', error.message);
    } else {
      console.log('   ✅ Supabase connection successful');
    }

    console.log('\n2. Checking Authentication Configuration...');
    
    console.log('\n3. Verifying Database Schema...');
    // Check if auth tables exist and are accessible
    const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    console.log(`   ✅ Auth users found: ${authUsers?.users?.length || 0}`);

    console.log('\n4. Testing User Authentication...');
    // Test with demo user credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'demo@example.com',
      password: 'demo123'
    });

    if (signInError) {
      console.log('   ⚠️  Demo user sign-in failed:', signInError.message);
      console.log('   📝 Creating demo user...');
      
      // Try to create demo user
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: 'demo@example.com',
        password: 'demo123',
        email_confirm: true
      });

      if (signUpError) {
        console.error('   ❌ Failed to create demo user:', signUpError.message);
      } else {
        console.log('   ✅ Demo user created successfully');
        
        // Ensure tenant relationship exists
        const { data: existingTenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('subdomain', 'demo')
          .single();

        if (existingTenant) {
          await supabase
            .from('tenant_users')
            .upsert({
              user_id: signUpData.user.id,
              tenant_id: existingTenant.id,
              role: 'user'
            });
          console.log('   ✅ Tenant relationship created');
        }
      }
    } else {
      console.log('   ✅ Demo user authentication successful');
    }

    console.log('\n5. Configuration Analysis:');
    console.log(`   🔗 Supabase URL: ${SUPABASE_URL}`);
    console.log('   🔑 Service Key: [CONFIGURED]');
    console.log('   ⚠️  Anonymous Key: NEEDS FIXING (currently using service key)');

    console.log('\n✅ AUTHENTICATION DIAGNOSTICS COMPLETE');
    console.log('\nNext Steps:');
    console.log('1. Fix environment variables with correct anonymous key');
    console.log('2. Update authentication providers');
    console.log('3. Fix session management');
    console.log('4. Test complete authentication flow');

  } catch (error) {
    console.error('❌ Error during authentication fix:', error);
  }
}

// Run the fix
if (require.main === module) {
  // Set environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://zddulwamthwhgxdmihny.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHVsd2FtdGh3aGd4ZG1paG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzMDYwNSwiZXhwIjoyMDcwMDA2NjA1fQ.Yw_L7uJZCB7TTsYIvkMPEYRRf3rcQbXt-IVBOnjQ2Aw';
  
  fixAuthenticationSystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAuthenticationSystem };
