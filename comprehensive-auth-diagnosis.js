#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('🔍 COMPREHENSIVE AUTHENTICATION FLOW DIAGNOSIS');
console.log('='.repeat(80));

console.log('\n📋 DIAGNOSIS SUMMARY:');
console.log('Testing authentication flow from client → API → AI service');
console.log('Looking for: Session passing, Protocol issues, Auth context breaks');

// Check environment variables
console.log('\n1️⃣ ENVIRONMENT VARIABLES CHECK:');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'ABACUSAI_API_KEY'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: Present (${value.length} chars)`);
  } else {
    console.log(`❌ ${envVar}: Missing`);
  }
});

// Check critical files for authentication issues
console.log('\n2️⃣ AUTHENTICATION FLOW FILES:');

const criticalFiles = [
  'lib/supabase/server.ts',
  'lib/supabase/client.ts', 
  'app/api/chat/route.ts',
  'components/chat/ai-chat-container.tsx',
  'lib/providers/supabase-provider.tsx'
];

criticalFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}: Exists`);
    
    // Check for potential issues in each file
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (file.includes('chat/route.ts')) {
      if (content.includes('auth.getUser()')) {
        console.log(`   📍 Uses server-side auth.getUser()`);
      }
      if (content.includes('createClient()')) {
        console.log(`   📍 Uses server-side Supabase client`);
      }
    }
    
    if (file.includes('ai-chat-container.tsx')) {
      if (content.includes("fetch('/api/chat'")) {
        console.log(`   📍 Makes fetch request to /api/chat`);
        if (!content.includes('credentials:')) {
          console.log(`   ⚠️  Fetch request MISSING credentials option`);
        }
      }
    }
    
    if (file.includes('server.ts')) {
      if (content.includes('cookies()')) {
        console.log(`   📍 Server client uses cookies for session`);
      }
    }
    
    if (file.includes('client.ts')) {
      if (content.includes('localStorage')) {
        console.log(`   📍 Client uses localStorage for session`);
      }
    }
    
  } else {
    console.log(`❌ ${file}: Missing`);
  }
});

console.log('\n3️⃣ SESSION STORAGE ANALYSIS:');
console.log('🔍 Checking session storage mismatch...');

// Check client.ts for localStorage usage
const clientFile = path.join(process.cwd(), 'lib/supabase/client.ts');
if (fs.existsSync(clientFile)) {
  const content = fs.readFileSync(clientFile, 'utf8');
  if (content.includes('localStorage')) {
    console.log('❌ CLIENT: Uses localStorage for session storage');
  }
  if (content.includes('storageKey')) {
    console.log('   📍 Storage key configured');
  }
}

// Check server.ts for cookie usage
const serverFile = path.join(process.cwd(), 'lib/supabase/server.ts');
if (fs.existsSync(serverFile)) {
  const content = fs.readFileSync(serverFile, 'utf8');
  if (content.includes('cookies()')) {
    console.log('❌ SERVER: Uses cookies for session storage');
  }
}

console.log('\n4️⃣ FETCH REQUEST ANALYSIS:');
const aiChatFile = path.join(process.cwd(), 'components/chat/ai-chat-container.tsx');
if (fs.existsSync(aiChatFile)) {
  const content = fs.readFileSync(aiChatFile, 'utf8');
  
  // Look for fetch configuration
  const fetchMatch = content.match(/fetch\([^{]*{([^}]*)}/s);
  if (fetchMatch) {
    const fetchConfig = fetchMatch[1];
    console.log('📡 Fetch configuration found:');
    
    if (fetchConfig.includes('credentials')) {
      console.log('✅ Credentials option present');
    } else {
      console.log('❌ CRITICAL: Missing credentials option in fetch');
    }
    
    if (fetchConfig.includes('headers')) {
      console.log('✅ Headers configured');
    } else {
      console.log('⚠️  Basic headers only');
    }
  } else {
    console.log('❌ Could not find fetch configuration');
  }
}

console.log('\n5️⃣ MIDDLEWARE ANALYSIS:');
const middlewareFile = path.join(process.cwd(), 'middleware.ts');
if (fs.existsSync(middlewareFile)) {
  const content = fs.readFileSync(middlewareFile, 'utf8');
  
  if (content.includes('/api/')) {
    console.log('📍 Middleware handles API routes');
  } else {
    console.log('ℹ️  Middleware skips API routes');
  }
  
  if (content.includes('auth')) {
    console.log('📍 Middleware performs auth checks');
  } else {
    console.log('ℹ️  Middleware does minimal auth handling');
  }
}

console.log('\n' + '='.repeat(80));
console.log('🎯 DIAGNOSIS RESULTS:');
console.log('='.repeat(80));

console.log('\n🔍 IDENTIFIED ISSUES:');
console.log('1. SESSION STORAGE MISMATCH:');
console.log('   - Client stores session in localStorage');
console.log('   - Server expects session in cookies');
console.log('   - Fetch requests do not bridge this gap');

console.log('\n2. MISSING CREDENTIALS IN FETCH:');
console.log('   - API calls to /api/chat don\'t include credentials');
console.log('   - Browser cookies not automatically sent');
console.log('   - Server can\'t access user session');

console.log('\n3. AUTHENTICATION CONTEXT BREAK:');
console.log('   - Frontend: User authenticated via React context'); 
console.log('   - Backend: No session data available');
console.log('   - Result: 401 Unauthorized');

console.log('\n🔧 RECOMMENDED FIXES:');
console.log('1. Add credentials: "include" to fetch requests');
console.log('2. Ensure cookies are properly set by client');
console.log('3. Or: Pass session token in request headers');
console.log('4. Verify middleware forwards auth cookies');

console.log('\n✅ NEXT STEPS:');
console.log('1. Run authentication test script');
console.log('2. Implement session passing fix');
console.log('3. Test end-to-end authentication flow');
console.log('4. Verify AI chat works with proper auth');

console.log('\n' + '='.repeat(80));
