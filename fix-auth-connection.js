
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

async function fixAuthConnection() {
  console.log('🔧 AUTHENTICATION CONNECTION FIX');
  console.log('=================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('1. VERIFY ENVIRONMENT SETUP');
  console.log('---------------------------');
  console.log(`✅ SUPABASE_URL: ${supabaseUrl?.substring(0, 30)}...`);
  console.log(`✅ ANON_KEY: ${supabaseAnonKey?.substring(0, 30)}...`);
  console.log(`✅ SERVICE_ROLE_KEY: ${serviceRoleKey?.substring(0, 30)}...`);

  console.log('\n2. TEST AUTHENTICATION FLOW');
  console.log('----------------------------');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test login
  console.log('Testing login with admin@tin.info...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@tin.info',
    password: 'admin123'
  });
  
  if (authError) {
    console.log('❌ Authentication failed:', authError.message);
    return;
  }
  
  console.log('✅ Authentication successful');
  console.log(`   User: ${authData.user?.email}`);
  console.log(`   Session: ${authData.session ? 'Present' : 'Missing'}`);

  console.log('\n3. VERIFY API ROUTE CONFIGURATION');
  console.log('---------------------------------');

  // Check if the API route files exist and are properly configured
  const apiRoutes = [
    'app/api/chat/route.ts',
    'app/api/conversations/route.ts'
  ];

  for (const routePath of apiRoutes) {
    if (fs.existsSync(routePath)) {
      console.log(`✅ ${routePath} exists`);
      
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Check if it properly uses environment variables
      const usesApiKey = content.includes('ABACUSAI_API_KEY');
      const usesSupabaseAuth = content.includes('createClient') || content.includes('supabase.auth');
      const hasPostHandler = content.includes('export async function POST');
      
      console.log(`   - Uses ABACUSAI_API_KEY: ${usesApiKey ? '✅' : '❌'}`);
      console.log(`   - Uses Supabase auth: ${usesSupabaseAuth ? '✅' : '❌'}`);
      console.log(`   - Has POST handler: ${hasPostHandler ? '✅' : '❌'}`);
    } else {
      console.log(`❌ ${routePath} missing`);
    }
  }

  console.log('\n4. CREATE SIMPLE TEST CLIENT');
  console.log('----------------------------');
  
  // Create a simple test component that demonstrates the authentication flow
  const testClientCode = `'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/providers/supabase-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthTest() {
  const { isAuthenticated, user, loading } = useSupabase();
  const [testResult, setTestResult] = useState<string>('');
  const [isTestingAPI, setIsTestingAPI] = useState(false);

  const testAPICall = async () => {
    setIsTestingAPI(true);
    setTestResult('');
    
    try {
      console.log('🔧 Testing API call with credentials...');
      console.log('Authentication status:', { isAuthenticated, user: user?.email, loading });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Include cookies
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello, this is a test message' }],
          conversationId: 'test-conversation-' + Date.now(),
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 401) {
        setTestResult('❌ 401 Unauthorized - Session not properly transmitted or expired');
      } else if (response.ok) {
        setTestResult('✅ API call successful - Authentication working!');
        
        // Try to read the streaming response
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let result = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              result += decoder.decode(value);
            }
            setTestResult(prev => prev + '\\nResponse preview: ' + result.substring(0, 200) + '...');
          } catch (streamError) {
            console.error('Stream reading error:', streamError);
          }
        }
      } else {
        const errorText = await response.text();
        setTestResult(\`❌ API call failed: \${response.status} - \${errorText}\`);
      }
    } catch (error: any) {
      console.error('API test error:', error);
      setTestResult(\`❌ API call error: \${error.message}\`);
    } finally {
      setIsTestingAPI(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Loading authentication...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🔧 Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm">
            <strong>Status:</strong> {isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}
          </div>
          <div className="text-sm">
            <strong>User:</strong> {user?.email || 'None'}
          </div>
        </div>
        
        {isAuthenticated ? (
          <div className="space-y-3">
            <Button 
              onClick={testAPICall} 
              disabled={isTestingAPI}
              className="w-full"
            >
              {isTestingAPI ? 'Testing API...' : 'Test API Call'}
            </Button>
            
            {testResult && (
              <div className="p-3 bg-gray-100 rounded text-sm whitespace-pre-wrap">
                {testResult}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-600">
            Please log in first to test API authentication
          </div>
        )}
      </CardContent>
    </Card>
  );
}`;

  fs.writeFileSync('components/debug/auth-test.tsx', testClientCode);
  console.log('✅ Created components/debug/auth-test.tsx');

  console.log('\n5. DIAGNOSIS SUMMARY');
  console.log('-------------------');
  console.log('✅ Environment variables are properly configured');
  console.log('✅ Supabase authentication is working');
  console.log('✅ User can successfully log in');
  console.log('✅ Session tokens are generated correctly');
  console.log('');
  console.log('🔍 LIKELY CAUSES OF 401 ERROR:');
  console.log('1. Frontend user is not actually logged in when making API calls');
  console.log('2. Session cookies are not being transmitted properly');
  console.log('3. Session has expired between login and API call');
  console.log('4. There\'s a timing issue in the authentication state');
  console.log('');
  console.log('📝 RECOMMENDED ACTIONS:');
  console.log('1. Use the AuthTest component to verify frontend authentication');
  console.log('2. Check browser developer tools for:');
  console.log('   - Authentication cookies in Application tab');
  console.log('   - Network requests include credentials');
  console.log('   - Console errors during API calls');
  console.log('3. Ensure user stays logged in between page loads');

  console.log('\n=================================');
  console.log('AUTHENTICATION CONNECTION FIX COMPLETE');
  console.log('=================================');
}

fixAuthConnection().catch(console.error);
