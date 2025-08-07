#!/usr/bin/env node

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

// Use service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function fixDemoUser() {
  console.log('🔧 FIXING DEMO USER AUTHENTICATION');
  console.log('='.repeat(50));

  try {
    // First, try to find the existing user
    console.log('\n1️⃣ Looking for existing demo user...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ Error listing users:', listError.message);
      return;
    }

    const existingUser = users?.find(user => user.email === 'john@doe.com');
    
    if (existingUser) {
      console.log(`✅ Found existing user: ${existingUser.email}`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Email Confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Update user to confirm email
      if (!existingUser.email_confirmed_at) {
        console.log('\n2️⃣ Confirming user email...');
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { 
            email_confirmed_at: new Date().toISOString(),
            email: 'john@doe.com'  // Ensure email is set
          }
        );

        if (updateError) {
          console.log('❌ Error updating user:', updateError.message);
        } else {
          console.log('✅ User email confirmed successfully');
        }
      } else {
        console.log('✅ User email already confirmed');
      }

      // Check tenant relationship
      console.log('\n3️⃣ Checking tenant relationship...');
      const { data: tenantUsers, error: tenantError } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('user_id', existingUser.id);

      if (tenantError) {
        console.log('❌ Error checking tenant relationship:', tenantError.message);
      } else if (tenantUsers && tenantUsers.length > 0) {
        console.log('✅ Tenant relationship exists');
        console.log(`   Tenant ID: ${tenantUsers[0].tenant_id}`);
      } else {
        console.log('⚠️  No tenant relationship found, creating one...');
        
        // Get or create a tenant
        const { data: tenants } = await supabase.from('tenants').select('*').limit(1);
        let tenantId;
        
        if (tenants && tenants.length > 0) {
          tenantId = tenants[0].id;
          console.log(`   Using existing tenant: ${tenantId}`);
        } else {
          // Create a new tenant
          const { data: newTenant, error: tenantCreateError } = await supabase
            .from('tenants')
            .insert({ 
              name: 'Default Tenant',
              settings: {}
            })
            .select()
            .single();

          if (tenantCreateError) {
            console.log('❌ Error creating tenant:', tenantCreateError.message);
            return;
          }
          
          tenantId = newTenant.id;
          console.log(`   Created new tenant: ${tenantId}`);
        }

        // Create tenant-user relationship
        const { error: relationshipError } = await supabase
          .from('tenant_users')
          .insert({
            tenant_id: tenantId,
            user_id: existingUser.id,
            role: 'admin'
          });

        if (relationshipError) {
          console.log('❌ Error creating tenant relationship:', relationshipError.message);
        } else {
          console.log('✅ Tenant relationship created');
        }
      }

    } else {
      console.log('⚠️  Demo user not found, creating...');
      
      // Create the demo user
      console.log('\n2️⃣ Creating demo user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'john@doe.com',
        password: 'johndoe123',
        email_confirmed_at: new Date().toISOString(), // Auto-confirm email
        user_metadata: { name: 'John Doe' }
      });

      if (createError) {
        console.log('❌ Error creating user:', createError.message);
        return;
      }

      console.log('✅ Demo user created successfully');
      console.log(`   User ID: ${newUser.user.id}`);

      // Create tenant relationship for new user
      console.log('\n3️⃣ Setting up tenant relationship...');
      
      // Get or create a tenant
      const { data: tenants } = await supabase.from('tenants').select('*').limit(1);
      let tenantId;
      
      if (tenants && tenants.length > 0) {
        tenantId = tenants[0].id;
      } else {
        const { data: newTenant } = await supabase
          .from('tenants')
          .insert({ name: 'Default Tenant', settings: {} })
          .select()
          .single();
        tenantId = newTenant.id;
      }

      await supabase.from('tenant_users').insert({
        tenant_id: tenantId,
        user_id: newUser.user.id,
        role: 'admin'
      });

      console.log('✅ Tenant relationship created');
    }

    console.log('\n4️⃣ Testing authentication...');
    
    // Test sign-in with regular client
    const testClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: signInResult, error: signInError } = await testClient.auth.signInWithPassword({
      email: 'john@doe.com',
      password: 'johndoe123'
    });

    if (signInError) {
      console.log('❌ Sign-in test failed:', signInError.message);
    } else {
      console.log('✅ Sign-in test successful');
      console.log(`   Session: ${signInResult.session ? 'Active' : 'None'}`);
      
      // Sign out to clean up
      await testClient.auth.signOut();
    }

  } catch (error) {
    console.error('❌ Error fixing demo user:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 Demo user should now be ready for testing!');
  console.log('Login: john@doe.com / johndoe123');
  console.log('='.repeat(50));
}

fixDemoUser().catch(console.error);
