
#!/usr/bin/env node

/**
 * Create Demo User Script
 * This will ensure the demo user exists for testing
 */

require('dotenv').config({ path: '/home/ubuntu/trainable-chatbot/.env.local' })

async function createDemoUser() {
  console.log('👤 Creating Demo User for Testing...\n')
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    // Use service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('🔧 Using service role for user creation...')
    
    // Create demo user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'john@doe.com',
      password: 'johndoe123',
      email_confirm: true
    })
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Demo user already exists')
        return true
      } else {
        console.log('❌ Error creating demo user:', error.message)
        return false
      }
    }
    
    console.log('✅ Demo user created successfully:', data.user.email)
    
    // Test login with demo credentials using anon key
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: 'john@doe.com',
      password: 'johndoe123'
    })
    
    if (signInError) {
      console.log('❌ Demo login test failed:', signInError.message)
      return false
    }
    
    console.log('✅ Demo login test successful!')
    
    // Sign out
    await anonSupabase.auth.signOut()
    
    return true
    
  } catch (error) {
    console.error('❌ Error creating demo user:', error)
    return false
  }
}

createDemoUser().then(success => {
  if (success) {
    console.log('\n🎉 Demo user is ready for testing!')
  } else {
    console.log('\n❌ Failed to create demo user. Check Supabase configuration.')
  }
})
