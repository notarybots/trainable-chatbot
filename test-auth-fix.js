
console.log('🧪 SUPABASE AUTHENTICATION TEST SUITE')
console.log('======================================')

const fs = require('fs')

// Load updated environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Decode JWT to check key validity
function decodeJWT(token) {
  try {
    const base64Payload = token.split('.')[1]
    const payload = Buffer.from(base64Payload, 'base64').toString()
    return JSON.parse(payload)
  } catch (error) {
    return null
  }
}

async function runAuthTests() {
  console.log('🔍 Step 1: Environment Validation')
  console.log('==================================')
  
  if (!SUPABASE_URL) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL is missing')
    return false
  } else {
    console.log('✅ SUPABASE_URL is configured')
  }
  
  if (!SUPABASE_ANON_KEY) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
    return false
  } else {
    console.log('✅ SUPABASE_ANON_KEY is configured')
  }
  
  // Validate anon key
  const anonDecoded = decodeJWT(SUPABASE_ANON_KEY)
  if (!anonDecoded) {
    console.log('❌ Invalid anon key format')
    return false
  }
  
  console.log('🔑 Anon Key Analysis:')
  console.log('   Role:', anonDecoded.role)
  console.log('   Issuer:', anonDecoded.iss)
  console.log('   Reference:', anonDecoded.ref)
  
  if (anonDecoded.role !== 'anon') {
    console.log('❌ Anon key has wrong role:', anonDecoded.role)
    console.log('   Expected: "anon", Got:', anonDecoded.role)
    return false
  } else {
    console.log('✅ Anon key has correct role: anon')
  }
  
  console.log('\n🌐 Step 2: Supabase Connection Test')
  console.log('===================================')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Test basic connection
    const { data, error } = await supabase.from('test').select('*').limit(1)
    
    // This might error if test table doesn't exist, but connection should work
    if (error && !error.message.includes('relation "public.test" does not exist')) {
      console.log('❌ Connection error:', error.message)
      return false
    } else {
      console.log('✅ Supabase connection successful')
    }
    
  } catch (error) {
    console.log('❌ Failed to create Supabase client:', error.message)
    return false
  }
  
  console.log('\n🔐 Step 3: Authentication API Test')
  console.log('==================================')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Test session retrieval
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message)
      return false
    } else {
      console.log('✅ Session retrieval successful')
    }
    
    // Test auth state
    console.log('   Current session:', sessionData.session ? 'Active' : 'None')
    
  } catch (error) {
    console.log('❌ Auth API test failed:', error.message)
    return false
  }
  
  console.log('\n📊 Step 4: Database Schema Check')
  console.log('=================================')
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Check if auth system is working by checking basic auth tables access
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError && !userError.message.includes('session_not_found')) {
      console.log('❌ User data access error:', userError.message)
    } else {
      console.log('✅ Auth user data access works')
    }
    
    // Try to access profiles table (common pattern)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (profileError) {
      if (profileError.message.includes('relation "public.profiles" does not exist')) {
        console.log('⚠️  Profiles table does not exist (this may be expected)')
      } else {
        console.log('❌ Profiles table access error:', profileError.message)
      }
    } else {
      console.log('✅ Profiles table access successful')
    }
    
  } catch (error) {
    console.log('❌ Database schema check failed:', error.message)
  }
  
  console.log('\n✅ Step 5: Test Summary')
  console.log('=======================')
  console.log('✅ Environment variables are properly configured')
  console.log('✅ Anonymous key has correct "anon" role')
  console.log('✅ Supabase client connection works')
  console.log('✅ Authentication API is accessible')
  console.log('✅ Ready for user authentication testing')
  
  console.log('\n🎯 NEXT STEPS FOR MANUAL TESTING:')
  console.log('==================================')
  console.log('1. Start your development server: npm run dev')
  console.log('2. Navigate to: http://localhost:3000/login')
  console.log('3. Try to create a new account')
  console.log('4. Try to sign in with existing account')
  console.log('5. Verify that authentication state persists')
  
  console.log('\n🐛 IF AUTHENTICATION STILL FAILS:')
  console.log('=================================')
  console.log('• Check Supabase dashboard → Authentication → Settings')
  console.log('• Ensure "Enable email confirmations" is OFF for testing')
  console.log('• Verify Row Level Security policies allow user creation')
  console.log('• Check browser console for detailed error messages')
  
  return true
}

// Run the comprehensive test
runAuthTests()
  .then(() => {
    console.log('\n🎉 Authentication fix validation complete!')
  })
  .catch(error => {
    console.log('❌ Test suite failed:', error.message)
  })
