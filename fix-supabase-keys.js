
console.log('🔧 AUTOMATED SUPABASE KEY FIX')
console.log('===============================')

const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function fetchCorrectAnonKey() {
  try {
    console.log('🔍 Attempting to fetch correct anonymous key...')
    
    // Method 1: Try to get project info using REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    // Check response headers for any key info
    const headers = Object.fromEntries(response.headers.entries())
    console.log('📡 API connection successful')
    
    // Since we can't directly fetch anon key via API for security reasons,
    // we'll use the Supabase CLI approach or manual method
    console.log('\n🔑 Generating proper anonymous key...')
    
    // Create a temporary anon key structure (this is a placeholder)
    // In production, this would come from Supabase dashboard
    const projectRef = SUPABASE_URL.split('//')[1].split('.')[0]
    
    console.log(`Project Reference: ${projectRef}`)
    
    // Try to use supabase CLI if available
    return new Promise((resolve) => {
      exec('which supabase', (error) => {
        if (error) {
          console.log('❌ Supabase CLI not found. Using manual method...')
          resolve(null)
        } else {
          console.log('✅ Supabase CLI found. Attempting to get keys...')
          exec('supabase status --project-id zddulwamthwhgxdmihny', (cliError, stdout) => {
            if (cliError) {
              console.log('❌ CLI command failed:', cliError.message)
              resolve(null)
            } else {
              console.log('CLI output:', stdout)
              resolve(null) // We'll handle this manually
            }
          })
        }
      })
    })
    
  } catch (error) {
    console.log('❌ Error fetching keys:', error.message)
    return null
  }
}

// Create a fixed environment file with correct structure
function createFixedEnvFile() {
  console.log('\n📝 Creating fixed environment configuration...')
  
  // For now, we'll create a template that the user needs to fill
  // But we'll also try to generate a proper anon key structure
  
  const envContent = `
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://zddulwamthwhgxdmihny.supabase.co
# ⚠️ REPLACE THE LINE BELOW WITH ACTUAL ANON KEY FROM SUPABASE DASHBOARD
NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE_WITH_ACTUAL_ANON_KEY_FROM_DASHBOARD
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# Multi-tenant Configuration
NEXT_PUBLIC_APP_DOMAIN=trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXT_PUBLIC_DEFAULT_TENANT=demo

# NextAuth Configuration
NEXTAUTH_URL=https://trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXTAUTH_SECRET=kJ8mN2qR5tU7wZ9bD1gF4hL6oP3sV8xC

# Abacus AI Configuration (if needed)
ABACUSAI_API_KEY=your-abacus-ai-key-here
`.trim()

  // Backup current .env.local
  const envPath = '.env.local'
  const backupPath = '.env.local.backup'
  
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath)
    console.log('✅ Backed up current .env.local to .env.local.backup')
  }
  
  // Write template (user will need to replace the anon key)
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Created fixed .env.local template')
  
  return true
}

// Try to get the actual anon key using a different approach
async function tryAlternativeKeyFetch() {
  console.log('\n🔄 Trying alternative method to get anon key...')
  
  try {
    // Method: Create a temporary user and check what key is needed
    const { createClient } = await import('@supabase/supabase-js')
    
    // Test different key formats to see which one works for anon operations
    const testKeys = [
      // Generate a potential anon key pattern (this is just for testing structure)
      // In reality, this needs to come from Supabase dashboard
    ]
    
    console.log('🔍 The anon key must be obtained from Supabase dashboard.')
    console.log('   Automated generation is not possible for security reasons.')
    
    return null
    
  } catch (error) {
    console.log('❌ Alternative method failed:', error.message)
    return null
  }
}

// Main fix function
async function fixSupabaseKeys() {
  console.log('🚀 Starting Supabase key fix process...\n')
  
  // Step 1: Attempt to fetch correct anon key
  const anonKey = await fetchCorrectAnonKey()
  
  // Step 2: Try alternative methods
  if (!anonKey) {
    await tryAlternativeKeyFetch()
  }
  
  // Step 3: Create fixed environment file template
  createFixedEnvFile()
  
  // Step 4: Provide manual instructions
  console.log('\n🎯 MANUAL STEPS REQUIRED:')
  console.log('==========================')
  console.log('1. Open Supabase Dashboard: https://app.supabase.com/project/zddulwamthwhgxdmihny')
  console.log('2. Go to Settings → API')
  console.log('3. Copy the "Project API keys" → "anon public" key')
  console.log('4. Replace "REPLACE_WITH_ACTUAL_ANON_KEY_FROM_DASHBOARD" in .env.local')
  console.log('5. Save the file and restart the development server')
  
  console.log('\n⚠️ IMPORTANT SECURITY NOTES:')
  console.log('- The anon key should have role "anon" not "service_role"')
  console.log('- Never use service_role key in frontend applications')
  console.log('- The anon key is safe to use in public/frontend code')
  console.log('- Keep the service_role key secure and server-side only')
  
  console.log('\n🔍 HOW TO VERIFY THE FIX:')
  console.log('1. After updating .env.local, run: node diagnose-supabase-auth.js')
  console.log('2. Check that "Anon Key Role: anon" (not service_role)')
  console.log('3. Start the dev server: npm run dev')
  console.log('4. Test signup/signin functionality')
  
  console.log('\n✅ Environment template created! Please follow manual steps above.')
}

// Run the fix
fixSupabaseKeys().catch(console.error)
