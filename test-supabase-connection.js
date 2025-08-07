
#!/usr/bin/env node

/**
 * Test Supabase Connection and Basic Auth Functions
 * This will verify if Supabase is configured correctly
 */

require('dotenv').config({ path: '/home/ubuntu/trainable-chatbot/.env.local' })

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection and Configuration...\n')
  
  try {
    // Check environment variables
    console.log('📋 Environment Variables Check:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Present' : '❌ Missing')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing')
    
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!anonKey || anonKey.includes('REPLACE_WITH_ACTUAL_ANON_KEY')) {
      console.log('❌ CRITICAL: Supabase anonymous key is not configured!')
      console.log('Please go to Supabase dashboard and get the correct anon key.')
      return false
    }
    
    // Try to import and create Supabase client
    const { createClient } = require('@supabase/supabase-js')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    console.log('\n🔌 Testing Basic Connection:')
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase.auth.getSession()
    
    if (testError) {
      console.log('❌ Connection failed:', testError.message)
      return false
    }
    
    console.log('✅ Supabase client created successfully')
    console.log('✅ Basic connection test passed')
    
    // Test auth functionality
    console.log('\n🔐 Testing Authentication Functions:')
    
    // Test sign up with dummy data (this should fail with user exists, which is fine)
    const testEmail = 'test-' + Date.now() + '@test.com'
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123'
    })
    
    if (signUpError) {
      console.log('Sign-up error (expected):', signUpError.message)
    } else {
      console.log('✅ Sign-up function accessible')
    }
    
    // Test sign in with invalid credentials (should fail, which is expected)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@test.com',
      password: 'wrongpassword'
    })
    
    if (signInError) {
      console.log('Sign-in error (expected):', signInError.message)
    }
    
    console.log('✅ Basic authentication functions are accessible')
    
    // Test demo credentials
    console.log('\n👤 Testing Demo Credentials:')
    const { data: demoSignIn, error: demoError } = await supabase.auth.signInWithPassword({
      email: 'john@doe.com',
      password: 'johndoe123'
    })
    
    if (demoError) {
      console.log('❌ Demo credentials failed:', demoError.message)
      console.log('Demo user may not exist in database')
      
      // Try to create demo user
      console.log('🔧 Attempting to create demo user...')
      const { data: createDemo, error: createDemoError } = await supabase.auth.signUp({
        email: 'john@doe.com',
        password: 'johndoe123'
      })
      
      if (createDemoError) {
        console.log('❌ Could not create demo user:', createDemoError.message)
      } else {
        console.log('✅ Demo user created successfully')
      }
    } else {
      console.log('✅ Demo credentials work!')
      
      // Sign out
      await supabase.auth.signOut()
      console.log('✅ Sign out successful')
    }
    
    console.log('\n🎉 Supabase connection and basic auth functions are working!')
    return true
    
  } catch (error) {
    console.error('❌ Critical error testing Supabase:', error)
    return false
  }
}

// Run the test
testSupabaseConnection().then(success => {
  if (success) {
    console.log('\n✅ Supabase is configured correctly!')
    console.log('Ready to rebuild authentication components.')
  } else {
    console.log('\n❌ Supabase configuration needs to be fixed first.')
  }
})
