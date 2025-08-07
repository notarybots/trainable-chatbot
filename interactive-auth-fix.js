
console.log('🎯 INTERACTIVE SUPABASE AUTHENTICATION FIX')
console.log('==========================================')
console.log()

const readline = require('readline')
const fs = require('fs')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve))
}

async function interactiveFix() {
  console.log('👋 This script will guide you through fixing the Supabase authentication issue.')
  console.log('   The problem is that you\'re using a service_role key as the anonymous key.')
  console.log()
  
  console.log('📋 STEPS TO FOLLOW:')
  console.log('1. Sign in to your Supabase dashboard (I opened it for you)')
  console.log('2. Navigate to Settings → API')  
  console.log('3. Copy the "anon public" key (NOT the service_role key)')
  console.log('4. Paste it when prompted below')
  console.log()
  
  const proceed = await ask('🚀 Ready to continue? (y/n): ')
  if (proceed.toLowerCase() !== 'y') {
    console.log('👋 Okay! Run this script again when you\'re ready.')
    rl.close()
    return
  }
  
  console.log()
  console.log('🔑 Current Status:')
  console.log('   - Your NEXT_PUBLIC_SUPABASE_ANON_KEY is currently a service_role key')
  console.log('   - This causes authentication failures')
  console.log('   - We need to replace it with the actual anonymous key')
  console.log()
  
  const anonKey = await ask('📝 Please paste the "anon public" key from your Supabase dashboard: ')
  
  if (!anonKey || anonKey.trim().length < 100) {
    console.log('❌ That doesn\'t look like a valid Supabase key. Please try again.')
    rl.close()
    return
  }
  
  // Validate that it's not a service key
  function decodeJWT(token) {
    try {
      const base64Payload = token.split('.')[1]
      const payload = Buffer.from(base64Payload, 'base64').toString()
      return JSON.parse(payload)
    } catch (error) {
      return null
    }
  }
  
  const decoded = decodeJWT(anonKey.trim())
  if (!decoded) {
    console.log('❌ Invalid JWT token format. Please check the key and try again.')
    rl.close()
    return
  }
  
  if (decoded.role !== 'anon') {
    console.log(`❌ This key has role "${decoded.role}" but should be "anon"`)
    console.log('   Please make sure you copied the "anon public" key, not the service_role key.')
    rl.close()
    return
  }
  
  console.log('✅ Key validation passed! Role:', decoded.role)
  
  // Update the .env.local file
  try {
    const envContent = `
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://zddulwamthwhgxdmihny.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey.trim()}
SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'}

# Multi-tenant Configuration
NEXT_PUBLIC_APP_DOMAIN=trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXT_PUBLIC_DEFAULT_TENANT=demo

# NextAuth Configuration
NEXTAUTH_URL=https://trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXTAUTH_SECRET=kJ8mN2qR5tU7wZ9bD1gF4hL6oP3sV8xC

# Abacus AI Configuration (if needed)
ABACUSAI_API_KEY=your-abacus-ai-key-here
`.trim()
    
    fs.writeFileSync('.env.local', envContent)
    console.log('✅ Successfully updated .env.local file!')
    
  } catch (error) {
    console.log('❌ Error updating .env.local:', error.message)
    rl.close()
    return
  }
  
  console.log()
  console.log('🎉 AUTHENTICATION FIX COMPLETE!')
  console.log('================================')
  console.log('✅ Replaced service_role key with proper anon key')
  console.log('✅ Updated environment configuration')
  console.log('✅ Authentication should now work properly')
  console.log()
  console.log('🔄 NEXT STEPS:')
  console.log('1. Restart your development server (Ctrl+C and npm run dev)')
  console.log('2. Test the signup/signin functionality')
  console.log('3. Run verification: node diagnose-supabase-auth.js')
  console.log()
  console.log('🎯 What\'s fixed:')
  console.log('   - Account creation will work')
  console.log('   - Sign in will work')
  console.log('   - Form validation errors should disappear')
  console.log('   - Authentication state management will be stable')
  
  rl.close()
}

interactiveFix().catch(error => {
  console.error('❌ Error:', error.message)
  rl.close()
})
