
/**
 * Complete Authentication System Rebuild Script
 * This script will rebuild the authentication system from scratch
 */

const fs = require('fs').promises
const path = require('path')

console.log('🔄 Starting Complete Authentication System Rebuild...\n')

async function main() {
  try {
    console.log('📋 Step 1: Analyzing Current State')
    
    // Read current env file
    const envPath = '/home/ubuntu/trainable-chatbot/.env.local'
    const envContent = await fs.readFile(envPath, 'utf8')
    
    console.log('Current .env.local content:')
    console.log(envContent)
    
    // Check if anon key is placeholder
    if (envContent.includes('REPLACE_WITH_ACTUAL_ANON_KEY_FROM_DASHBOARD')) {
      console.log('❌ CRITICAL ISSUE: Supabase anonymous key is placeholder!')
      console.log('This is why authentication is completely broken.\n')
      
      console.log('🔧 IMMEDIATE FIX REQUIRED:')
      console.log('1. Go to: https://app.supabase.com/project/zddulwamthwhgxdmihny/settings/api')
      console.log('2. Copy the "anon public" key (should start with "eyJ" and have "anon" role)')
      console.log('3. Replace NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
      console.log('\n⚠️  DO NOT use the service_role key as anon key!')
      
      // Create a simple fix script
      const fixScript = `
// Run this script after getting the correct anon key
const fs = require('fs')

const newEnvContent = \`# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://zddulwamthwhgxdmihny.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ACTUAL_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHVsd2FtdGh3aGd4ZG1paG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzMDYwNSwiZXhwIjoyMDcwMDA2NjA1fQ.Yw_L7uJZCB7TTsYIvkMPEYRRf3rcQbXt-IVBOnjQ2Aw

# Multi-tenant Configuration
NEXT_PUBLIC_APP_DOMAIN=trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXT_PUBLIC_DEFAULT_TENANT=demo

# NextAuth Configuration (not used with Supabase)
NEXTAUTH_URL=https://trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXTAUTH_SECRET=kJ8mN2qR5tU7wZ9bD1gF4hL6oP3sV8xC

# Abacus AI Configuration
ABACUSAI_API_KEY=your-abacus-ai-key-here
\`

fs.writeFileSync('/home/ubuntu/trainable-chatbot/.env.local', newEnvContent)
console.log('✅ Environment file updated!')
`
      
      await fs.writeFile('/home/ubuntu/trainable-chatbot/fix-env-key.js', fixScript)
      
      return false
    }
    
    console.log('✅ Environment configuration looks valid')
    return true
    
  } catch (error) {
    console.error('❌ Error analyzing current state:', error)
    return false
  }
}

main().then(success => {
  if (!success) {
    console.log('\n🛑 Cannot proceed with rebuild until Supabase key is fixed.')
    console.log('Please fix the environment configuration first.')
  } else {
    console.log('\n✅ Ready to proceed with authentication rebuild!')
  }
})
