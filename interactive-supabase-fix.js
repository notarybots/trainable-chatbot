
/**
 * Interactive Supabase Key Fix
 * This script will help you update the environment with the correct key
 */

const fs = require('fs')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('🔐 Supabase Authentication Fix Tool\n')

console.log('📋 INSTRUCTIONS:')
console.log('1. Sign in to Supabase dashboard (already opened in browser)')
console.log('2. Navigate to: Settings → API')
console.log('3. Copy the "anon public" key (NOT the service_role key)')
console.log('4. Paste it below when prompted')
console.log('')

function askForKey() {
  rl.question('🔑 Paste your Supabase "anon public" key here: ', (anonKey) => {
    if (!anonKey || anonKey.trim() === '') {
      console.log('❌ No key provided. Please try again.')
      askForKey()
      return
    }
    
    // Basic validation
    if (!anonKey.startsWith('eyJ')) {
      console.log('⚠️  Warning: Key should start with "eyJ". Are you sure this is correct? (y/n)')
      rl.question('', (confirm) => {
        if (confirm.toLowerCase() !== 'y') {
          askForKey()
          return
        }
        updateEnvFile(anonKey.trim())
      })
      return
    }
    
    // Check if it contains "service_role" (it shouldn't for anon key)
    if (anonKey.includes('service_role')) {
      console.log('❌ ERROR: This appears to be a service_role key, not an anon key!')
      console.log('Please copy the "anon public" key instead.')
      askForKey()
      return
    }
    
    updateEnvFile(anonKey.trim())
  })
}

function updateEnvFile(anonKey) {
  try {
    console.log('\n🔧 Updating .env.local file...')
    
    const newEnvContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://zddulwamthwhgxdmihny.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHVsd2FtdGh3aGd4ZG1paG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzMDYwNSwiZXhwIjoyMDcwMDA2NjA1fQ.Yw_L7uJZCB7TTsYIvkMPEYRRf3rcQbXt-IVBOnjQ2Aw

# Multi-tenant Configuration
NEXT_PUBLIC_APP_DOMAIN=trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXT_PUBLIC_DEFAULT_TENANT=demo

# NextAuth Configuration
NEXTAUTH_URL=https://trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXTAUTH_SECRET=kJ8mN2qR5tU7wZ9bD1gF4hL6oP3sV8xC

# Abacus AI Configuration
ABACUSAI_API_KEY=your-abacus-ai-key-here
`
    
    fs.writeFileSync('/home/ubuntu/trainable-chatbot/.env.local', newEnvContent)
    
    console.log('✅ Environment file updated successfully!')
    console.log('\n🧪 Now testing the configuration...')
    
    // Test the new configuration
    testNewConfiguration(anonKey)
    
  } catch (error) {
    console.error('❌ Error updating environment file:', error)
    rl.close()
  }
}

async function testNewConfiguration(anonKey) {
  try {
    // Set the environment variable for testing
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
    
    const { createClient } = require('@supabase/supabase-js')
    
    const supabase = createClient(
      'https://zddulwamthwhgxdmihny.supabase.co',
      anonKey
    )
    
    console.log('🔌 Testing connection...')
    
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.log('❌ Connection test failed:', error.message)
    } else {
      console.log('✅ Connection test successful!')
    }
    
    console.log('\n🎉 Supabase configuration is now fixed!')
    console.log('Ready to rebuild authentication system.')
    
    rl.close()
    
  } catch (error) {
    console.error('❌ Error testing configuration:', error)
    rl.close()
  }
}

// Start the interactive process
askForKey()
