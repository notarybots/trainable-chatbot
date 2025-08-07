#!/usr/bin/env node

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function createFreshDemoUser() {
  console.log('🆕 CREATING FRESH DEMO USER');
  console.log('='.repeat(50));

  try {
    // Delete existing user if exists
    console.log('\n1️⃣ Cleaning up existing user...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find(user => user.email === 'admin@tin.info');
    
    if (existingUser) {
      console.log('🗑️  Removing existing admin@tin.info user...');
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    // Create new user with admin@tin.info (the email user mentioned they're using)
    console.log('\n2️⃣ Creating new demo user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@tin.info',
      password: 'admin123',
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { 
        name: 'Admin User',
        role: 'admin' 
      },
      app_metadata: {
        role: 'admin'
      }
    });

    if (createError) {
      console.log('❌ Error creating user:', createError.message);
      return;
    }

    console.log('✅ New demo user created successfully');
    console.log(`   Email: admin@tin.info`);
    console.log(`   User ID: ${newUser.user.id}`);

    // Set up tenant relationship
    console.log('\n3️⃣ Setting up tenant relationship...');
    
    const { data: tenants } = await supabase.from('tenants').select('*').limit(1);
    let tenantId;
    
    if (tenants && tenants.length > 0) {
      tenantId = tenants[0].id;
      console.log(`   Using existing tenant: ${tenantId}`);
    } else {
      const { data: newTenant } = await supabase
        .from('tenants')
        .insert({ 
          name: 'Admin Tenant',
          settings: {} 
        })
        .select()
        .single();
      tenantId = newTenant.id;
      console.log(`   Created new tenant: ${tenantId}`);
    }

    const { error: relationshipError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: newUser.user.id,
        role: 'admin'
      });

    if (relationshipError) {
      console.log('❌ Error creating tenant relationship:', relationshipError.message);
    } else {
      console.log('✅ Tenant relationship created');
    }

    // Test authentication immediately
    console.log('\n4️⃣ Testing authentication...');
    
    const testClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: signInResult, error: signInError } = await testClient.auth.signInWithPassword({
      email: 'admin@tin.info',
      password: 'admin123'
    });

    if (signInError) {
      console.log('❌ Sign-in test failed:', signInError.message);
    } else {
      console.log('✅ Sign-in test successful');
      console.log(`   User: ${signInResult.user?.email}`);
      console.log(`   Session: ${signInResult.session ? 'Active' : 'None'}`);
      
      // Test API call with session
      if (signInResult.session) {
        console.log('\n5️⃣ Testing API call with session...');
        
        // This simulates what the server-side code does
        const { data: userData, error: userError } = await testClient.auth.getUser();
        
        if (userError) {
          console.log('❌ API user check failed:', userError.message);
        } else {
          console.log('✅ API user check successful');
          console.log(`   User ID from API: ${userData.user?.id}`);
          
          // Test tenant lookup
          const { data: tenantData, error: tenantCheckError } = await testClient
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', userData.user?.id)
            .single();
          
          if (tenantCheckError) {
            console.log('❌ Tenant lookup failed:', tenantCheckError.message);
          } else {
            console.log('✅ Tenant lookup successful');
            console.log(`   Tenant ID: ${tenantData.tenant_id}`);
          }
        }
      }
      
      // Sign out
      await testClient.auth.signOut();
      console.log('🚪 Signed out');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 FRESH DEMO USER READY!');
  console.log('Email: admin@tin.info');
  console.log('Password: admin123');
  console.log('='.repeat(50));
}

createFreshDemoUser().catch(console.error);
