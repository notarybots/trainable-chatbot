'use client';

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
            setTestResult(prev => prev + '\nResponse preview: ' + result.substring(0, 200) + '...');
          } catch (streamError) {
            console.error('Stream reading error:', streamError);
          }
        }
      } else {
        const errorText = await response.text();
        setTestResult(`❌ API call failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error('API test error:', error);
      setTestResult(`❌ API call error: ${error.message}`);
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
}