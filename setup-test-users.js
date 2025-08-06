
const { createClient } = require('@supabase/supabase-js');

async function setupTestUsers() {
    console.log('🔧 SETTING UP TEST USERS AND TENANT RELATIONSHIPS');
    console.log('==================================================\n');

    // Load environment variables
    require('dotenv').config({ path: '.env.local' });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.log('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // 1. Create or verify demo tenant
        console.log('📋 STEP 1: Setting up demo tenant');
        console.log('----------------------------------');

        const { data: existingTenant, error: tenantSelectError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', 'demo')
            .single();

        let tenantId = 'demo';

        if (tenantSelectError && tenantSelectError.code === 'PGRST116') {
            // Tenant doesn't exist, create it
            const { data: newTenant, error: tenantCreateError } = await supabase
                .from('tenants')
                .insert({
                    id: 'demo',
                    name: 'Demo Tenant',
                    settings: {
                        created_by: 'system',
                        purpose: 'testing and demo'
                    }
                })
                .select()
                .single();

            if (tenantCreateError) {
                console.log('❌ Failed to create tenant:', tenantCreateError.message);
                return;
            }
            console.log('✅ Demo tenant created:', newTenant.id);
        } else if (existingTenant) {
            console.log('✅ Demo tenant already exists:', existingTenant.id);
        } else {
            console.log('❌ Error checking tenant:', tenantSelectError.message);
            return;
        }

        // 2. Create test user in auth.users
        console.log('\n👤 STEP 2: Creating test user in auth');
        console.log('--------------------------------------');

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: 'demo@example.com',
            password: 'demo123',
            email_confirm: true
        });

        if (authError && !authError.message.includes('already exists')) {
            console.log('❌ Failed to create auth user:', authError.message);
            return;
        }

        let userId;
        if (authData?.user) {
            userId = authData.user.id;
            console.log('✅ Auth user created:', userId);
        } else {
            // User might already exist, try to find them
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === 'demo@example.com');
            if (existingUser) {
                userId = existingUser.id;
                console.log('✅ Found existing auth user:', userId);
            } else {
                console.log('❌ Could not find or create auth user');
                return;
            }
        }

        // 3. Create tenant_user relationship
        console.log('\n🔗 STEP 3: Creating tenant-user relationship');
        console.log('----------------------------------------------');

        const { data: existingRelation, error: relationSelectError } = await supabase
            .from('tenant_users')
            .select('*')
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();

        if (relationSelectError && relationSelectError.code === 'PGRST116') {
            // Relationship doesn't exist, create it
            const { data: newRelation, error: relationCreateError } = await supabase
                .from('tenant_users')
                .insert({
                    user_id: userId,
                    tenant_id: tenantId,
                    role: 'admin',
                    metadata: {
                        created_by: 'system',
                        is_test_user: true
                    }
                })
                .select()
                .single();

            if (relationCreateError) {
                console.log('❌ Failed to create tenant relationship:', relationCreateError.message);
                return;
            }
            console.log('✅ Tenant-user relationship created');
        } else if (existingRelation) {
            console.log('✅ Tenant-user relationship already exists');
        } else {
            console.log('❌ Error checking relationship:', relationSelectError.message);
            return;
        }

        // 4. Verify the setup
        console.log('\n✅ STEP 4: Verification');
        console.log('------------------------');

        const { data: tenantUsers, error: verifyError } = await supabase
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
            .eq('user_id', userId);

        if (verifyError) {
            console.log('❌ Verification failed:', verifyError.message);
        } else {
            console.log('✅ Setup verified successfully!');
            console.log('Test user details:');
            console.log(`   Email: demo@example.com`);
            console.log(`   Password: demo123`);
            console.log(`   User ID: ${userId}`);
            console.log(`   Tenant: ${tenantId}`);
            console.log(`   Role: ${tenantUsers[0]?.role}`);
        }

        // 5. Test conversation creation
        console.log('\n🆕 STEP 5: Testing conversation creation');
        console.log('----------------------------------------');

        const { data: testConversation, error: conversationError } = await supabase
            .from('conversations')
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                title: 'Setup Test Conversation',
                metadata: { 
                    created_by: 'setup_script', 
                    timestamp: new Date().toISOString() 
                }
            })
            .select()
            .single();

        if (conversationError) {
            console.log('❌ Test conversation creation failed:', conversationError.message);
        } else {
            console.log('✅ Test conversation created successfully!');
            console.log(`   Conversation ID: ${testConversation.id}`);
            
            // Clean up test conversation
            await supabase
                .from('conversations')
                .delete()
                .eq('id', testConversation.id);
            console.log('🧹 Test conversation cleaned up');
        }

        console.log('\n🎉 SETUP COMPLETE! The system is ready for testing.');
        console.log('📌 You can now:');
        console.log('   1. Start the development server: npm run dev');
        console.log('   2. Navigate to the application');
        console.log('   3. Log in with demo@example.com / demo123');
        console.log('   4. Create conversations successfully');

    } catch (error) {
        console.log('❌ Setup failed:', error.message);
        console.log('Error details:', JSON.stringify(error, null, 2));
    }
}

setupTestUsers().catch(console.error);
