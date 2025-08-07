
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log('=== AUTH TEST API ROUTE ===');
  
  try {
    console.log('1. Request received');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    console.log('2. Creating Supabase client...');
    const supabase = createClient();
    
    console.log('3. Getting user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('4. User result:', {
      user: user ? { id: user.id, email: user.email } : null,
      error: userError ? userError.message : null
    });
    
    if (userError) {
      console.log('5. User error details:', userError);
    }
    
    if (!user) {
      console.log('6. No user - returning 401');
      return new Response(JSON.stringify({ 
        error: 'No user found',
        details: userError?.message || 'Session validation failed'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log('7. User authenticated successfully');
    return new Response(JSON.stringify({ 
      success: true,
      user: { id: user.id, email: user.email }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('8. Caught error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
