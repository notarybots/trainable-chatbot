
const { createClient } = require('@supabase/supabase-js');

async function comprehensiveDebug() {
    console.log('🔍 COMPREHENSIVE SYSTEM DEBUGGING');
    console.log('==================================\n');

    // 1. Environment Variables Check
    console.log('📋 STEP 1: Environment Variables');
    console.log('---------------------------------');
    
    const requiredEnvs = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
        'SUPABASE_SERVICE_ROLE_KEY',
        'ABACUSAI_API_KEY'
    ];
    
    console.log('Environment variables:');
    requiredEnvs.forEach(env => {
        const value = process.env[env];
        if (value) {
            console.log(`✅ ${env}: ${value.substring(0, 20)}...`);
        } else {
            console.log(`❌ ${env}: MISSING`);
        }
    });

    // 2. Supabase Connection Test
    console.log('\n📡 STEP 2: Supabase Connection');
    console.log('---------------------------------');
    
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials');
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test basic connection
        const { data, error } = await supabase.from('conversations').select('count', { count: 'exact', head: true });
        
        if (error) {
            console.log('❌ Supabase connection failed:', error.message);
            console.log('Error details:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Supabase connection successful');
            console.log(`📊 Conversations table exists with ${data?.length || 0} records`);
        }
    } catch (error) {
        console.log('❌ Supabase connection error:', error.message);
    }

    // 3. Database Tables Check
    console.log('\n🗄️ STEP 3: Database Schema');
    console.log('-----------------------------');
    
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const tables = ['conversations', 'messages', 'tenant_users', 'tenants'];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase.from(table).select('*').limit(1);
                if (error) {
                    console.log(`❌ ${table} table: ${error.message}`);
                } else {
                    console.log(`✅ ${table} table: exists`);
                }
            } catch (e) {
                console.log(`❌ ${table} table: ${e.message}`);
            }
        }
    } catch (error) {
        console.log('❌ Database schema check failed:', error.message);
    }

    // 4. Authentication Test
    console.log('\n🔐 STEP 4: Authentication Test');
    console.log('--------------------------------');
    
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Check for test user
        const { data: users, error: usersError } = await supabase
            .from('auth.users')
            .select('id, email')
            .eq('email', 'demo@example.com')
            .limit(1);

        if (usersError) {
            console.log('❌ User lookup failed:', usersError.message);
        } else if (users?.length) {
            const user = users[0];
            console.log(`✅ Test user found: ${user.email} (${user.id})`);
            
            // Check tenant relationship
            const { data: tenantUsers, error: tenantError } = await supabase
                .from('tenant_users')
                .select('tenant_id')
                .eq('user_id', user.id);

            if (tenantError) {
                console.log('❌ Tenant lookup failed:', tenantError.message);
            } else if (tenantUsers?.length) {
                console.log(`✅ User has ${tenantUsers.length} tenant relationship(s)`);
            } else {
                console.log('❌ User has no tenant relationships');
            }
        } else {
            console.log('❌ No test user found');
        }
    } catch (error) {
        console.log('❌ Authentication test failed:', error.message);
    }

    // 5. API Routes Test
    console.log('\n🌐 STEP 5: API Routes Test');
    console.log('----------------------------');
    
    try {
        // Test if server is running
        const serverUrl = 'http://localhost:3000';
        
        const response = await fetch(`${serverUrl}/api/conversations`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log(`API Response Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 401) {
            console.log('✅ API route accessible (authentication required as expected)');
        } else if (response.ok) {
            const data = await response.json();
            console.log('✅ API route working, data:', data);
        } else {
            const errorText = await response.text();
            console.log('❌ API route error:', errorText);
        }
    } catch (error) {
        console.log('❌ API route test failed:', error.message);
        console.log('💡 Make sure the development server is running (npm run dev)');
    }

    // 6. Conversation Creation Simulation
    console.log('\n🆕 STEP 6: Conversation Creation Simulation');
    console.log('--------------------------------------------');
    
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get test user
        const { data: users } = await supabase
            .from('auth.users')
            .select('id')
            .eq('email', 'demo@example.com')
            .limit(1);

        if (!users?.length) {
            console.log('❌ Cannot simulate - test user not found');
            return;
        }

        const userId = users[0].id;

        // Get tenant relationship
        const { data: tenantUsers } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', userId)
            .limit(1);

        if (!tenantUsers?.length) {
            console.log('❌ Cannot simulate - no tenant relationship found');
            return;
        }

        const tenantId = tenantUsers[0].tenant_id;
        console.log(`📋 Test parameters: User ${userId}, Tenant ${tenantId}`);

        // Attempt to create conversation
        const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                title: 'Debug Test Conversation',
                metadata: { debug: true, timestamp: new Date().toISOString() }
            })
            .select()
            .single();

        if (createError) {
            console.log('❌ Conversation creation failed:', createError.message);
            console.log('Error details:', JSON.stringify(createError, null, 2));
        } else {
            console.log('✅ Conversation created successfully!');
            console.log('Conversation details:', {
                id: newConversation.id,
                title: newConversation.title,
                tenant_id: newConversation.tenant_id,
                user_id: newConversation.user_id
            });

            // Clean up test conversation
            await supabase
                .from('conversations')
                .delete()
                .eq('id', newConversation.id);
            console.log('🧹 Test conversation cleaned up');
        }
    } catch (error) {
        console.log('❌ Conversation simulation failed:', error.message);
    }

    // 7. Abacus AI Test
    console.log('\n🤖 STEP 7: Abacus AI Integration Test');
    console.log('--------------------------------------');
    
    try {
        if (!process.env.ABACUSAI_API_KEY) {
            console.log('❌ ABACUSAI_API_KEY not found');
            return;
        }

        const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-mini',
                messages: [{ role: 'user', content: 'Hello, this is a test.' }],
                max_tokens: 50,
                stream: false
            })
        });

        console.log(`Abacus AI Response Status: ${response.status}`);
        
        if (response.ok) {
            console.log('✅ Abacus AI integration working');
        } else {
            const errorText = await response.text();
            console.log('❌ Abacus AI error:', errorText);
        }
    } catch (error) {
        console.log('❌ Abacus AI test failed:', error.message);
    }

    console.log('\n🏁 DEBUGGING COMPLETE');
    console.log('======================');
    console.log('💡 Next steps based on results above:');
    console.log('1. Fix any missing environment variables');
    console.log('2. Resolve database table/schema issues');
    console.log('3. Ensure user/tenant relationships exist');
    console.log('4. Verify API routes are accessible');
    console.log('5. Test in the actual application');
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

comprehensiveDebug().catch(console.error);
