
console.log('🔐 Debugging authentication issue...');

// Test 1: Check if we can create a Supabase server client
async function testSupabaseServerClient() {
  console.log('\n🧪 Test 1: Testing Supabase server client creation');
  
  try {
    const { createServerClient } = await import('@supabase/ssr');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Environment variables:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('- SUPABASE_ANON_KEY:', supabaseAnonKey ? `Present (${supabaseAnonKey.substring(0, 10)}...)` : 'Missing');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ Missing Supabase environment variables');
      return false;
    }
    
    // Create a mock cookie store for testing
    const mockCookieStore = {
      getAll: () => [],
      setAll: () => {}
    };
    
    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return mockCookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Mock implementation
        },
      },
    });
    
    console.log('✅ Supabase server client created successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to create Supabase server client:', error.message);
    return false;
  }
}

// Test 2: Simulate the API route authentication check
async function testApiRouteAuth() {
  console.log('\n🧪 Test 2: Simulating API route authentication');
  
  try {
    // Test with a direct fetch to the API route
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: No authentication headers - relying on cookies like the frontend
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test message' }],
        conversationId: 'test-conv-id'
      })
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('API Response Body:', responseText);
    
    if (response.status === 401) {
      console.log('❌ 401 Unauthorized - This confirms the authentication issue');
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Raw error text:', responseText);
      }
      
      return false;
    }
    
    console.log('✅ API route authentication working');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to test API route:', error.message);
    return false;
  }
}

// Test 3: Check if server is running and accessible
async function testServerConnection() {
  console.log('\n🧪 Test 3: Testing server connection');
  
  try {
    const response = await fetch('http://localhost:3000/api/conversations', {
      method: 'GET'
    });
    
    console.log('Server Response Status:', response.status);
    
    if (response.status === 404) {
      console.log('✅ Server is running (404 is expected for GET on conversations)');
      return true;
    } else if (response.status === 401) {
      console.log('⚠️ Server is running but authentication is failing');
      return true;
    } else {
      console.log('✅ Server is responding with status:', response.status);
      return true;
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running. Please start the dev server.');
      return false;
    } else {
      console.error('❌ Server connection error:', error.message);
      return false;
    }
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting authentication diagnostics...\n');
  
  const test1 = await testSupabaseServerClient();
  const test3 = await testServerConnection();
  
  if (test3) {
    const test2 = await testApiRouteAuth();
    
    console.log('\n📊 Diagnostic Summary:');
    console.log('- Supabase Client Creation:', test1 ? '✅ Pass' : '❌ Fail');
    console.log('- Server Connection:', test3 ? '✅ Pass' : '❌ Fail');
    console.log('- API Route Authentication:', test2 ? '✅ Pass' : '❌ Fail');
    
    if (!test2 && test1 && test3) {
      console.log('\n💡 Analysis:');
      console.log('The issue is that the API route is getting a 401 error because:');
      console.log('1. The frontend is not sending authentication cookies');
      console.log('2. OR the server-side Supabase client is not reading cookies properly');
      console.log('3. OR there is no valid session (user needs to login)');
      console.log('\n🔧 Next steps:');
      console.log('1. Make sure user is logged in');
      console.log('2. Check if authentication cookies are being set');
      console.log('3. Debug the Supabase server client cookie handling');
    }
  }
}

runDiagnostics();
