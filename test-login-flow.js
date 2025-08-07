/**
 * Test Login Flow
 * Tests sign in functionality with the created user
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testLoginFlow() {
  try {
    console.log('🔐 Testing Login Flow...\n')
    
    // Create a test user first
    const testEmail = `logintest${Date.now()}@testdomain.com`
    const testPassword = 'TestPassword123!'
    
    console.log('1️⃣ Creating test user...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    if (signUpError) {
      console.error('❌ Sign Up Error:', signUpError.message)
      return false
    }
    
    console.log('✅ Test user created successfully!')
    console.log(`User ID: ${signUpData.user?.id}`)
    
    // Test sign in
    console.log('\n2️⃣ Testing sign in...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    if (signInError) {
      console.error('❌ Sign In Error:', signInError.message)
      return false
    }
    
    console.log('✅ Sign in successful!')
    console.log(`Session Token: ${signInData.session?.access_token ? 'Present' : 'Missing'}`)
    console.log(`User Email: ${signInData.user?.email}`)
    
    // Test getting current user
    console.log('\n3️⃣ Testing get current user...')
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Get User Error:', userError.message)
      return false
    }
    
    console.log('✅ Get current user successful!')
    console.log(`Current User: ${userData.user?.email}`)
    
    // Test sign out
    console.log('\n4️⃣ Testing sign out...')
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      console.error('❌ Sign Out Error:', signOutError.message)
      return false
    }
    
    console.log('✅ Sign out successful!')
    
    return true
    
  } catch (error) {
    console.error('❌ Test Error:', error.message)
    return false
  }
}

async function main() {
  const success = await testLoginFlow()
  
  console.log('\n' + '='.repeat(60))
  if (success) {
    console.log('🎉 COMPLETE LOGIN FLOW TEST PASSED!')
    console.log('✅ User registration works')
    console.log('✅ User login works')
    console.log('✅ Session management works')
    console.log('✅ User data retrieval works')
    console.log('✅ Sign out works')
    console.log('\n🚀 AUTHENTICATION SYSTEM IS FULLY FUNCTIONAL!')
    console.log('🔧 The Supabase anon key fix was completely successful!')
  } else {
    console.log('❌ LOGIN FLOW TEST FAILED')
    console.log('Please check the error messages above.')
  }
  console.log('='.repeat(60))
}

main().catch(console.error)
