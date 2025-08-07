
console.log('🔍 SUPABASE AUTHENTICATION DIAGNOSIS')
console.log('=====================================')

// Read environment variables
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n📋 Current Environment Configuration:')
console.log('URL:', SUPABASE_URL)
console.log('Anon Key (first 50 chars):', SUPABASE_ANON_KEY?.substring(0, 50) + '...')
console.log('Service Key (first 50 chars):', SUPABASE_SERVICE_KEY?.substring(0, 50) + '...')

// Decode JWT tokens to check roles
function decodeJWT(token) {
  try {
    if (!token) return null
    const base64Payload = token.split('.')[1]
    const payload = Buffer.from(base64Payload, 'base64').toString()
    return JSON.parse(payload)
  } catch (error) {
    return null
  }
}

console.log('\n🔐 JWT Token Analysis:')
const anonDecoded = decodeJWT(SUPABASE_ANON_KEY)
const serviceDecoded = decodeJWT(SUPABASE_SERVICE_KEY)

console.log('Anon Key Role:', anonDecoded?.role)
console.log('Service Key Role:', serviceDecoded?.role)

// Check if anon key is actually service key
const isUsingServiceAsAnon = anonDecoded?.role === 'service_role'

console.log('\n⚠️  CRITICAL ISSUE DETECTION:')
if (isUsingServiceAsAnon) {
  console.log('❌ MAJOR SECURITY ISSUE: Using service_role key as anonymous key!')
  console.log('   This will cause authentication failures and security vulnerabilities.')
  console.log('   The anonymous key should have role "anon", not "service_role".')
} else if (anonDecoded?.role === 'anon') {
  console.log('✅ Anonymous key role is correct')
} else {
  console.log('❌ Anonymous key role is invalid:', anonDecoded?.role)
}

// Test Supabase connection with current config
console.log('\n🌐 Testing Supabase Connection...')

async function testSupabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    // Test with current (problematic) config
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    console.log('📡 Testing auth configuration...')
    
    // Try to get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message)
    } else {
      console.log('✅ Session check passed')
    }
    
    // Try to sign up a test user (this should fail with service role key)
    console.log('📝 Testing user signup...')
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    })
    
    if (signupError) {
      console.log('❌ Signup error:', signupError.message)
      if (signupError.message.includes('signup is disabled') || signupError.message.includes('service_role')) {
        console.log('   This error confirms the service_role key issue!')
      }
    } else {
      console.log('✅ Signup test passed')
    }
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message)
  }
}

// Fetch correct keys from Supabase API
async function getCorrectKeys() {
  try {
    console.log('\n🔑 Fetching correct Supabase keys...')
    
    // Use service key to get project info
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    if (response.ok) {
      console.log('✅ Service key connection successful')
      
      // The anon key should be available in Supabase dashboard
      // For security, we should get it from the dashboard instead of API
      console.log('\n📋 MANUAL FIX REQUIRED:')
      console.log('1. Go to your Supabase dashboard: https://app.supabase.com/project/zddulwamthwhgxdmihny')
      console.log('2. Navigate to Settings → API')
      console.log('3. Copy the "anon" key (NOT the service_role key)')
      console.log('4. Replace NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local with the anon key')
      console.log('5. Keep SUPABASE_SERVICE_ROLE_KEY as is (for server-side operations)')
      
    } else {
      console.log('❌ Service key connection failed:', response.status)
    }
  } catch (error) {
    console.log('❌ Error fetching keys:', error.message)
  }
}

// Run all tests
async function runDiagnosis() {
  await testSupabaseConnection()
  await getCorrectKeys()
  
  console.log('\n🔧 SUMMARY OF FIXES NEEDED:')
  console.log('=====================================')
  
  if (isUsingServiceAsAnon) {
    console.log('❌ CRITICAL: Replace NEXT_PUBLIC_SUPABASE_ANON_KEY with actual anon key')
    console.log('❌ SECURITY: Service role key should never be used in frontend')
    console.log('❌ AUTH: This is why signup/signin is failing')
  }
  
  console.log('\n✅ After fixing, authentication should work properly!')
}

runDiagnosis().catch(console.error)
