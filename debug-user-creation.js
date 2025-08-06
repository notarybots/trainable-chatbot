
const { createClient } = require('@supabase/supabase-js');

async function debugUserCreation() {
    console.log('🔍 DEBUGGING USER CREATION');
    console.log('===========================\n');

    require('dotenv').config({ path: '.env.local' });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Service Role Key: ${serviceRoleKey ? 'Present' : 'Missing'}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        // 1. Check existing users first
        console.log('👥 Checking existing users...');
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.log('❌ Failed to list users:', listError.message);
            console.log('Error details:', JSON.stringify(listError, null, 2));
        } else {
            console.log(`✅ Found ${existingUsers?.users?.length || 0} existing users`);
            
            const demoUser = existingUsers?.users?.find(u => u.email === 'demo@example.com');
            if (demoUser) {
                console.log(`✅ Demo user already exists: ${demoUser.id}`);
                
                // Use existing user and set up tenant relationship
                const tenantId = '94b493c4-c9f0-4361-a63a-7870bd4037be'; // Demo Corporation
                const userId = demoUser.id;
                
                console.log('\n🔗 Setting up tenant relationship for existing user...');
                const { data: relationData, error: relationError } = await supabase
                    .from('tenant_users')
                    .upsert({
                        user_id: userId,
                        tenant_id: tenantId,
                        role: 'admin',
                        metadata: {
                            created_by: 'debug_script',
                            is_test_user: true,
                            updated_at: new Date().toISOString()
                        }
                    }, {
                        onConflict: 'user_id,tenant_id'
                    })
                    .select()
                    .single();

                if (relationError) {
                    console.log('❌ Failed to create tenant relationship:', relationError.message);
                } else {
                    console.log('✅ Tenant relationship created/updated successfully');
                }

                // Test conversation creation
                console.log('\n🆕 Testing conversation creation...');
                const { data: testConv, error: convError } = await supabase
                    .from('conversations')
                    .insert({
                        tenant_id: tenantId,
                        user_id: userId,
                        title: 'Debug Test Conversation',
                        metadata: { debug: true }
                    })
                    .select()
                    .single();

                if (convError) {
                    console.log('❌ Conversation creation failed:', convError.message);
                    console.log('Error details:', JSON.stringify(convError, null, 2));
                } else {
                    console.log('✅ Conversation created successfully!', testConv.id);
                    
                    // Clean up
                    await supabase.from('conversations').delete().eq('id', testConv.id);
                    console.log('🧹 Test conversation cleaned up');
                }

                return; // Exit early since user exists
            }
        }

        // 2. Try to create new user if none exists
        console.log('\n👤 Attempting to create new user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: 'demo@example.com',
            password: 'demo123',
            email_confirm: true
        });

        console.log('Auth data:', authData);
        console.log('Auth error:', authError);

        if (authError) {
            console.log('❌ Failed to create user:', authError.message);
            console.log('Error code:', authError.status);
            console.log('Full error:', JSON.stringify(authError, null, 2));
        } else if (authData?.user) {
            console.log('✅ User created successfully:', authData.user.id);
        }

    } catch (error) {
        console.log('❌ Unexpected error:', error.message);
        console.log('Stack trace:', error.stack);
    }
}

debugUserCreation().catch(console.error);
