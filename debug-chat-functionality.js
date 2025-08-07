
const fs = require('fs');

async function debugChatFunctionality() {
  console.log('🔍 Debugging Chat Functionality Issues...\n');
  
  // Check if server is running
  console.log('1️⃣  Checking server status...');
  try {
    const response = await fetch('http://localhost:3000');
    const statusCode = response.status;
    console.log(`✅ Server is running (Status: ${statusCode})`);
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('Please start the server first: yarn dev');
    return;
  }
  
  // Check console logs for client-side errors
  console.log('\n2️⃣  Checking server logs...');
  try {
    if (fs.existsSync('dev-server.log')) {
      const logs = fs.readFileSync('dev-server.log', 'utf8');
      const recentLogs = logs.split('\n').slice(-20).join('\n');
      console.log('Recent server logs:');
      console.log(recentLogs);
    }
  } catch (error) {
    console.log('Could not read server logs');
  }

  // Check environment variables
  console.log('\n3️⃣  Checking environment configuration...');
  const envFiles = ['.env', '.env.local', 'app/.env'];
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      console.log(`✅ ${envFile} exists`);
      const content = fs.readFileSync(envFile, 'utf8');
      
      // Check for critical environment variables
      const hasSupabaseUrl = content.includes('NEXT_PUBLIC_SUPABASE_URL=');
      const hasSupabaseAnonKey = content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
      const hasAbacusKey = content.includes('ABACUSAI_API_KEY=');
      
      console.log(`  - Has Supabase URL: ${hasSupabaseUrl}`);
      console.log(`  - Has Supabase Anon Key: ${hasSupabaseAnonKey}`);
      console.log(`  - Has Abacus AI Key: ${hasAbacusKey}`);
      
      if (hasAbacusKey) {
        const keyMatch = content.match(/ABACUSAI_API_KEY=["']?([^"'\n]+)["']?/);
        if (keyMatch) {
          const key = keyMatch[1];
          const isPlaceholder = key.includes('your-abacus-ai-key') || key.includes('placeholder') || key.length < 10;
          console.log(`  - Abacus AI Key is placeholder: ${isPlaceholder}`);
          if (!isPlaceholder) {
            console.log(`  - Abacus AI Key length: ${key.length} chars`);
          }
        }
      }
    } else {
      console.log(`⚠️  ${envFile} not found`);
    }
  }

  // Test API endpoints without auth first
  console.log('\n4️⃣  Testing API endpoints...');
  
  // Test conversations endpoint without auth (should return 401)
  try {
    const conversationsResponse = await fetch('http://localhost:3000/api/conversations');
    const conversationsData = await conversationsResponse.text();
    console.log(`Conversations API (no auth): ${conversationsResponse.status} - ${conversationsData}`);
  } catch (error) {
    console.log('❌ Error testing conversations API:', error.message);
  }

  // Test chat endpoint without auth (should return 401 or 400)
  try {
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        conversationId: 'test-id'
      })
    });
    const chatData = await chatResponse.text();
    console.log(`Chat API (no auth): ${chatResponse.status} - ${chatData}`);
  } catch (error) {
    console.log('❌ Error testing chat API:', error.message);
  }

  // Check database tables
  console.log('\n5️⃣  Database structure recommendations...');
  console.log('The following tables should exist in your Supabase database:');
  console.log('  - conversations (with RLS policies)');
  console.log('  - messages (with RLS policies)');
  console.log('  - tenant_users (for user-tenant relationships)');
  console.log('  - tenants (for multi-tenancy)');
  console.log('  - Test user should exist with credentials: john@doe.com / johndoe123');
  
  // Check types file
  console.log('\n6️⃣  Checking TypeScript types...');
  const typesFiles = ['lib/types.ts', 'lib/types/database.ts'];
  for (const typeFile of typesFiles) {
    if (fs.existsSync(typeFile)) {
      console.log(`✅ ${typeFile} exists`);
    } else {
      console.log(`⚠️  ${typeFile} not found`);
    }
  }

  // Recommendations
  console.log('\n7️⃣  Next Steps for Fixing Chat Functionality:');
  console.log('1. Verify user authentication is working (login with john@doe.com)');
  console.log('2. Check browser dev tools console for JavaScript errors');
  console.log('3. Ensure database tables exist and RLS policies are correct');
  console.log('4. Test "New Chat" button click handler in browser');
  console.log('5. Test message input submission with Enter key and Send button');
  console.log('6. Verify API responses are being processed correctly in frontend');
  
  console.log('\n🔍 Debug analysis complete!');
}

// Run the debug function
debugChatFunctionality().catch(error => {
  console.error('Debug script error:', error);
});
