
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

async function fixTenantSetup() {
    console.log('🔧 FIXING TENANT SETUP WITH PROPER UUIDS');
    console.log('=========================================\n');

    require('dotenv').config({ path: '.env.local' });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // 1. Check existing tenants
        console.log('📋 STEP 1: Checking existing tenants');
        console.log('------------------------------------');

        const { data: existingTenants, error: tenantsError } = await supabase
            .from('tenants')
            .select('*');

        if (tenantsError) {
            console.log('❌ Error checking tenants:', tenantsError.message);
        } else {
            console.log(`✅ Found ${existingTenants?.length || 0} existing tenants`);
            if (existingTenants?.length > 0) {
                existingTenants.forEach(tenant => {
                    console.log(`   - ${tenant.name} (${tenant.id})`);
                });
            }
        }

        // 2. Create or use first tenant
        let tenantId;
        
        if (existingTenants?.length > 0) {
            // Use the first existing tenant
            tenantId = existingTenants[0].id;
            console.log(`✅ Using existing tenant: ${existingTenants[0].name} (${tenantId})`);
        } else {
            // Create a new tenant
            console.log('\n📋 Creating new demo tenant');
            console.log('-----------------------------');
            
            const newTenantId = crypto.randomUUID();
            const { data: newTenant, error: createTenantError } = await supabase
                .from('tenants')
                .insert({
                    id: newTenantId,
                    name: 'Demo Tenant',
                    settings: {
                        created_by: 'setup_script',
                        purpose: 'testing and demo'
                    }
                })
                .select()
                .single();

            if (createTenantError) {
                console.log('❌ Failed to create tenant:', createTenantError.message);
                return;
            }
            
            tenantId = newTenant.id;
            console.log(`✅ Created new tenant: ${newTenant.name} (${tenantId})`);
        }

        // 3. Create or verify test user
        console.log('\n👤 STEP 2: Setting up test user');
        console.log('--------------------------------');

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: 'demo@example.com',
            password: 'demo123',
            email_confirm: true
        });

        let userId;
        if (authError?.message?.includes('already exists')) {
            // User already exists, find them
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === 'demo@example.com');
            if (existingUser) {
                userId = existingUser.id;
                console.log(`✅ Using existing user: ${userId}`);
            }
        } else if (authData?.user) {
            userId = authData.user.id;
            console.log(`✅ Created new user: ${userId}`);
        }

        if (!userId) {
            console.log('❌ Failed to get user ID');
            return;
        }

        // 4. Create tenant-user relationship
        console.log('\n🔗 STEP 3: Creating tenant-user relationship');
        console.log('----------------------------------------------');

        // Check if relationship already exists
        const { data: existingRelation, error: relationCheckError } = await supabase
            .from('tenant_users')
            .select('*')
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (relationCheckError?.code === 'PGRST116') {
            // Relationship doesn't exist, create it
            const { data: newRelation, error: createRelationError } = await supabase
                .from('tenant_users')
                .insert({
                    user_id: userId,
                    tenant_id: tenantId,
                    role: 'admin',
                    metadata: {
                        created_by: 'setup_script',
                        is_test_user: true,
                        created_at: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (createRelationError) {
                console.log('❌ Failed to create relationship:', createRelationError.message);
                console.log('Error details:', JSON.stringify(createRelationError, null, 2));
            } else {
                console.log('✅ Tenant-user relationship created successfully');
            }
        } else if (existingRelation) {
            console.log('✅ Tenant-user relationship already exists');
        } else if (relationCheckError) {
            console.log('❌ Error checking relationship:', relationCheckError.message);
        }

        // 5. Final verification
        console.log('\n✅ STEP 4: Final verification');
        console.log('------------------------------');

        const { data: verification, error: verifyError } = await supabase
            .from('tenant_users')
            .select(`
                user_id,
                tenant_id,
                role,
                tenants (
                    id,
                    name
                )
            `)
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (verifyError) {
            console.log('❌ Verification failed:', verifyError.message);
        } else {
            console.log('🎉 SETUP SUCCESSFUL!');
            console.log('====================');
            console.log('Test Credentials:');
            console.log(`  📧 Email: demo@example.com`);
            console.log(`  🔑 Password: demo123`);
            console.log(`  👤 User ID: ${userId}`);
            console.log(`  🏢 Tenant: ${verification.tenants?.name} (${tenantId})`);
            console.log(`  👑 Role: ${verification.role}`);
        }

        // 6. Test conversation creation
        console.log('\n🆕 STEP 5: Testing conversation creation');
        console.log('----------------------------------------');

        const { data: testConversation, error: conversationError } = await supabase
            .from('conversations')
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                title: 'Setup Verification Test',
                metadata: { 
                    test: true, 
                    created_at: new Date().toISOString(),
                    created_by: 'setup_script'
                }
            })
            .select()
            .single();

        if (conversationError) {
            console.log('❌ Conversation creation test failed:', conversationError.message);
            console.log('Error details:', JSON.stringify(conversationError, null, 2));
        } else {
            console.log('✅ Conversation creation test PASSED!');
            console.log(`   Created conversation: ${testConversation.id}`);
            console.log(`   Title: ${testConversation.title}`);
            
            // Clean up
            await supabase.from('conversations').delete().eq('id', testConversation.id);
            console.log('🧹 Test conversation cleaned up');
        }

        console.log('\n🚀 READY FOR TESTING!');
        console.log('======================');
        console.log('Next steps:');
        console.log('1. Start the dev server: npm run dev');
        console.log('2. Open the application in your browser');
        console.log('3. Login with demo@example.com / demo123');
        console.log('4. Try creating a conversation');

    } catch (error) {
        console.log('❌ Setup failed with error:', error.message);
        console.log('Stack trace:', error.stack);
    }
}

fixTenantSetup().catch(console.error);
