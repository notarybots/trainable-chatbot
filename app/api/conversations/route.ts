

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getConversations, createConversation, deleteConversation } from '@/lib/database/conversations';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get tenant_id from user
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!tenantUser) {
      return new Response(JSON.stringify({ error: 'No tenant found for user' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const conversations = await getConversations(tenantUser.tenant_id, user.id);
    
    return new Response(JSON.stringify(conversations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Conversations API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, metadata = {} } = body;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get tenant_id from user
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!tenantUser) {
      return new Response(JSON.stringify({ error: 'No tenant found for user' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const conversation = await createConversation({
      tenant_id: tenantUser.tenant_id,
      user_id: user.id,
      title: title || 'New Conversation',
      metadata,
    });

    if (!conversation) {
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(conversation), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create conversation API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

