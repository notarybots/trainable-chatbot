
/**
 * TARGETED FIX: Create Missing Tenant-User Relationships
 * 
 * This script directly addresses the root cause identified in diagnostics:
 * - Users exist in auth.users but have 0 tenant relationships
 * - This causes foreign key violations when creating conversations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

async function fixTenantUserRelationships() {
  console.log('🔧 FIXING TENANT-USER RELATIONSHIPS');
  console.log('📅 Started at:', new Date().toISOString());

  // Initialize Supabase client with service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    logError('Missing Supabase environment variables');
    return false;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // ===================================================================
    // STEP 1: GET DEMO TENANT INFO
    // ===================================================================
    logSection('STEP 1: Getting Demo Tenant Info');

    const { data: demoTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'demo')
      .single();

    if (tenantError) {
      logError(`Error fetching demo tenant: ${tenantError.message}`);
      return false;
    }

    logSuccess(`Demo tenant found: ${demoTenant.name} (${demoTenant.id})`);

    // ===================================================================
    // STEP 2: GET EXISTING USERS
    // ===================================================================
    logSection('STEP 2: Getting Existing Users');

    // These are the user IDs identified from the diagnostics
    const demoUserId = 'a5fd006f-7e4f-4c8f-ae59-19fb7c4bfb3e';
    const testUserId = 'ef24e4af-7e25-4b6e-8c41-75f2ff4386b0';

    // Verify these users exist in auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      logError(`Error fetching users: ${usersError.message}`);
      return false;
    }

    const demoUser = users.users.find(u => u.id === demoUserId);
    const testUser = users.users.find(u => u.id === testUserId);

    if (demoUser) {
      logSuccess(`Demo user found: ${demoUser.email} (${demoUser.id})`);
    } else {
      logError(`Demo user not found with ID: ${demoUserId}`);
    }

    if (testUser) {
      logSuccess(`Test user found: ${testUser.email} (${testUser.id})`);
    } else {
      logError(`Test user not found with ID: ${testUserId}`);
    }

    // ===================================================================
    // STEP 3: CREATE TENANT-USER RELATIONSHIPS
    // ===================================================================
    logSection('STEP 3: Creating Tenant-User Relationships');

    let relationshipsCreated = 0;

    // Create relationship for demo user
    if (demoUser) {
      const { data: demoRelation, error: demoRelError } = await supabase
        .from('tenant_users')
        .upsert({
          tenant_id: demoTenant.id,
          user_id: demoUserId,
          role: 'user',
          permissions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id,user_id'
        })
        .select();

      if (demoRelError) {
        logError(`Error creating demo user relationship: ${demoRelError.message}`);
      } else {
        logSuccess(`Demo user relationship created: ${demoUser.email} -> ${demoTenant.name} (user)`);
        relationshipsCreated++;
      }
    }

    // Create relationship for test user
    if (testUser) {
      const { data: testRelation, error: testRelError } = await supabase
        .from('tenant_users')
        .upsert({
          tenant_id: demoTenant.id,
          user_id: testUserId,
          role: 'admin',
          permissions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id,user_id'
        })
        .select();

      if (testRelError) {
        logError(`Error creating test user relationship: ${testRelError.message}`);
      } else {
        logSuccess(`Test user relationship created: ${testUser.email} -> ${demoTenant.name} (admin)`);
        relationshipsCreated++;
      }
    }

    // ===================================================================
    // STEP 4: VERIFY RELATIONSHIPS WERE CREATED
    // ===================================================================
    logSection('STEP 4: Verifying Relationships');

    const { data: allRelationships, error: verifyError } = await supabase
      .from('tenant_users')
      .select(`
        *,
        tenants(name, subdomain)
      `)
      .eq('tenant_id', demoTenant.id);

    if (verifyError) {
      logError(`Error verifying relationships: ${verifyError.message}`);
    } else {
      logSuccess(`Total tenant-user relationships found: ${allRelationships.length}`);
      allRelationships.forEach(rel => {
        logInfo(`  - User ${rel.user_id} -> ${rel.tenants.name} (${rel.role})`);
      });
    }

    // ===================================================================
    // STEP 5: TEST CONVERSATION CREATION
    // ===================================================================
    logSection('STEP 5: Testing Conversation Creation');

    if (relationshipsCreated > 0) {
      // Try to create a test conversation with the demo user
      const { data: testConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: demoTenant.id,
          user_id: demoUserId,
          title: 'Fix Verification Test',
          metadata: { created_by: 'tenant_user_fix', test: true }
        })
        .select()
        .single();

      if (convError) {
        logError(`Conversation creation still failing: ${convError.message}`);
      } else {
        logSuccess(`Test conversation created successfully: ${testConversation.id}`);

        // Test message creation
        const { data: testMessage, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: testConversation.id,
            role: 'user',
            content: 'Testing message creation after tenant-user fix',
            metadata: { test: true }
          })
          .select()
          .single();

        if (msgError) {
          logError(`Message creation failed: ${msgError.message}`);
        } else {
          logSuccess(`Test message created successfully: ${testMessage.id}`);
        }

        // Clean up test data
        await supabase.from('conversations').delete().eq('id', testConversation.id);
        logInfo('Test conversation cleaned up');
      }
    }

    // ===================================================================
    // FINAL REPORT
    // ===================================================================
    logSection('FIX COMPLETE');

    if (relationshipsCreated > 0) {
      logSuccess(`🎉 Successfully created ${relationshipsCreated} tenant-user relationships!`);
      logSuccess('The conversation creation issue should now be resolved.');
      logInfo('You can now test the application with:');
      logInfo('  - Email: demo@example.com');
      logInfo('  - Password: demo123');
    } else {
      logError('No tenant-user relationships were created. Manual intervention may be required.');
    }

    return relationshipsCreated > 0;

  } catch (error) {
    logError(`Fix failed with error: ${error.message}`);
    console.error(error);
    return false;
  }
}

// Run the fix
fixTenantUserRelationships();
