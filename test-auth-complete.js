/**
 * Comprehensive Authentication Test
 * Tests account creation, login, and basic functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Starting Comprehensive Authentication Test\n')

console.log('📋 Configuration Check:')
console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET'}`)
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuthentication() {
  try {
    // Generate unique test email
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'
    
    console.log('🔐 Testing Authentication Flow...')
    console.log(`Test Email: ${testEmail}`)
    
    // Test 1: Sign Up
    console.log('\n1️⃣ Testing Sign Up...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    if (signUpError) {
      console.error('❌ Sign Up Error:', signUpError.message)
      return false
    }
    
    console.log('✅ Sign Up Successful!')
    console.log(`User ID: ${signUpData.user?.id}`)
    
    // Test 2: Sign In
    console.log('\n2️⃣ Testing Sign In...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    if (signInError) {
      console.error('❌ Sign In Error:', signInError.message)
      return false
    }
    
    console.log('✅ Sign In Successful!')
    console.log(`Session: ${signInData.session ? 'Active' : 'None'}`)
    
    // Test 3: Get Current User
    console.log('\n3️⃣ Testing Get Current User...')
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Get User Error:', userError.message)
      return false
    }
    
    console.log('✅ Get User Successful!')
    console.log(`Current User: ${userData.user?.email}`)
    
    // Test 4: Database Connection (if tables exist)
    console.log('\n4️⃣ Testing Database Connection...')
    try {
      const { data: dbTest, error: dbError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (dbError && !dbError.message.includes('relation "users" does not exist')) {
        console.error('❌ Database Error:', dbError.message)
        return false
      }
      
      console.log('✅ Database Connection Working!')
    } catch (dbErr) {
      console.log('⚠️  Database tables may not exist yet (this is normal)')
    }
    
    // Test 5: Sign Out
    console.log('\n5️⃣ Testing Sign Out...')
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      console.error('❌ Sign Out Error:', signOutError.message)
      return false
    }
    
    console.log('✅ Sign Out Successful!')
    
    return true
    
  } catch (error) {
    console.error('❌ Test Error:', error.message)
    return false
  }
}

async function main() {
  const success = await testAuthentication()
  
  console.log('\n' + '='.repeat(50))
  if (success) {
    console.log('🎉 ALL AUTHENTICATION TESTS PASSED!')
    console.log('✅ Account creation works')
    console.log('✅ Login functionality works')
    console.log('✅ Session management works')
    console.log('✅ User retrieval works')
    console.log('✅ Sign out works')
    console.log('\n🚀 Authentication system is fully functional!')
  } else {
    console.log('❌ SOME TESTS FAILED')
    console.log('Please check the error messages above.')
  }
  console.log('='.repeat(50))
}

main().catch(console.error)
