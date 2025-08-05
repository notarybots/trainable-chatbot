
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function EnvChecker() {
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseConnection: string;
    chatApi: string;
  }>({
    supabaseUrl: 'Checking...',
    supabaseAnonKey: 'Checking...',
    supabaseConnection: 'Checking...',
    chatApi: 'Checking...'
  });

  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        // Check environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING';

        // Check Supabase connection
        let supabaseConnection = 'Failed';
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.getSession();
          if (!error) {
            supabaseConnection = 'Connected';
          } else {
            supabaseConnection = `Error: ${error.message}`;
          }
        } catch (err) {
          supabaseConnection = `Connection Error: ${err}`;
        }

        // Check Chat API
        let chatApi = 'Failed';
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'test' }],
              sessionId: 'debug-test'
            })
          });
          if (response.ok) {
            chatApi = 'Available';
          } else {
            chatApi = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (err) {
          chatApi = `API Error: ${err}`;
        }

        setEnvStatus({
          supabaseUrl: supabaseUrl.includes('supabase.co') ? '✅ Valid' : `❌ ${supabaseUrl}`,
          supabaseAnonKey: supabaseAnonKey.startsWith('eyJ') ? '✅ JWT Format' : `❌ ${supabaseAnonKey.substring(0, 50)}...`,
          supabaseConnection,
          chatApi
        });
      } catch (error) {
        console.error('Environment check failed:', error);
      }
    };

    checkEnvironment();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-lg max-w-sm text-xs">
      <h3 className="font-bold mb-2 text-red-600">🔧 Debug Panel</h3>
      <div className="space-y-1">
        <div><strong>Supabase URL:</strong> {envStatus.supabaseUrl}</div>
        <div><strong>Anon Key:</strong> {envStatus.supabaseAnonKey}</div>
        <div><strong>DB Connection:</strong> {envStatus.supabaseConnection}</div>
        <div><strong>Chat API:</strong> {envStatus.chatApi}</div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Fix environment variables in Vercel Dashboard
      </div>
    </div>
  );
}
