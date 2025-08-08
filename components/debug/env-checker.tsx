
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function EnvChecker() {
  const [isMounted, setIsMounted] = useState(false);
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseConnection: string;
    chatApi: string;
  }>({
    supabaseUrl: 'Loading...',
    supabaseAnonKey: 'Loading...',
    supabaseConnection: 'Loading...',
    chatApi: 'Loading...'
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const checkEnvironment = async () => {
      try {
        // Check environment variables safely on client side
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING';

        // Check Supabase connection with proper error handling
        let supabaseConnection = 'Failed';
        try {
          const supabase = createClient();
          if (supabase && typeof supabase?.auth?.getSession === 'function') {
            const { error } = await supabase.auth.getSession();
            if (!error) {
              supabaseConnection = '✅ Connected';
            } else {
              supabaseConnection = `❌ Error: ${error?.message?.substring(0, 50) || 'Unknown error'}`;
            }
          } else {
            supabaseConnection = '❌ Client not initialized (missing env vars)';
          }
        } catch (err) {
          supabaseConnection = `❌ Connection Error: ${err instanceof Error ? err.message.substring(0, 50) : 'Unknown error'}`;
        }

        // Check Chat API with detailed error logging
        let chatApi = 'Testing...';
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
            chatApi = '✅ Available';
          } else {
            const errorText = await response.text();
            chatApi = `❌ HTTP ${response.status}: ${errorText.substring(0, 50)}...`;
          }
        } catch (err) {
          chatApi = `❌ Network Error: ${err instanceof Error ? err.message.substring(0, 50) : 'Unknown'}`;
        }

        setEnvStatus({
          supabaseUrl: supabaseUrl?.includes?.('supabase.co') ? '✅ Valid' : `❌ ${supabaseUrl}`,
          supabaseAnonKey: (supabaseAnonKey?.startsWith?.('eyJ') || supabaseAnonKey?.startsWith?.('sb-')) 
            ? '✅ JWT Format' 
            : `❌ ${supabaseAnonKey?.substring?.(0, 30) || 'INVALID'}...`,
          supabaseConnection,
          chatApi
        });
      } catch (error) {
        console.error('Environment check failed:', error);
        setEnvStatus({
          supabaseUrl: '❌ Check failed',
          supabaseAnonKey: '❌ Check failed',
          supabaseConnection: '❌ Check failed',
          chatApi: '❌ Check failed'
        });
      }
    };

    checkEnvironment();
  }, [isMounted]);

  // Prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border rounded-lg p-4 shadow-lg max-w-sm text-xs z-40">
      <h3 className="font-bold mb-2 text-red-600">🔧 Debug Panel</h3>
      <div className="space-y-1">
        <div><strong>Supabase URL:</strong> {envStatus?.supabaseUrl || 'Loading...'}</div>
        <div><strong>Anon Key:</strong> {envStatus?.supabaseAnonKey || 'Loading...'}</div>
        <div><strong>DB Connection:</strong> {envStatus?.supabaseConnection || 'Loading...'}</div>
        <div><strong>Chat API:</strong> {envStatus?.chatApi || 'Loading...'}</div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Fix environment variables in Vercel Dashboard
      </div>
    </div>
  );
}
