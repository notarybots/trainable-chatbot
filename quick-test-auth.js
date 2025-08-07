
/**
 * Quick Authentication Test Script
 * Run this after fixing the Supabase key to verify everything works
 */

require('dotenv').config({ path: '/home/ubuntu/trainable-chatbot/.env.local' })

async function quickAuthTest() {
  console.log('🧪 Quick Authentication Test\n')
  
  try {
    // Check if key is still placeholder
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!anonKey || anonKey.includes('REPLACE_WITH_ACTUAL_ANON_KEY')) {
      console.log('❌ STOP: Supabase key still needs to be fixed!')
      console.log('Run: node interactive-supabase-fix.js')
      return false
    }
    
    console.log('✅ Environment key looks good')
    
    // Test Supabase connection
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    console.log('🔌 Testing connection...')
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('❌ Connection failed:', error.message)
      return false
    }
    
    console.log('✅ Connection successful!')
    
    // Test demo credentials
    console.log('👤 Testing demo credentials...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'john@doe.com',
      password: 'johndoe123'
    })
    
    if (signInError) {
      console.log('⚠️  Demo credentials failed:', signInError.message)
      console.log('Demo user may need to be created')
      
      // Try creating demo user
      console.log('🔧 Attempting to create demo user...')
      const { createClient: createAdminClient } = require('@supabase/supabase-js')
      const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: 'john@doe.com',
        password: 'johndoe123',
        email_confirm: true
      })
      
      if (createError && !createError.message.includes('already registered')) {
        console.log('❌ Could not create demo user:', createError.message)
        return false
      }
      
      console.log('✅ Demo user created/exists')
    } else {
      console.log('✅ Demo credentials work!')
      // Sign out after test
      await supabase.auth.signOut()
    }
    
    console.log('\n🎉 Authentication system is ready!')
    console.log('\n📋 Next steps:')
    console.log('1. Start dev server: cd /home/ubuntu/trainable-chatbot/app && npm run dev')
    console.log('2. Test login page: http://localhost:3000/simple-login')
    console.log('3. Use demo credentials: john@doe.com / johndoe123')
    
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

quickAuthTest()
