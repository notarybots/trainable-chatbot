

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createMessage } from '@/lib/database/messages';
import { updateConversation } from '@/lib/database/conversations';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  conversationId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, conversationId, model = 'gpt-4.1-mini', temperature = 0.7, maxTokens = 3000 } = body;

    console.log('Chat API called with:', { 
      messageCount: messages?.length,
      conversationId,
      model 
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'Conversation ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get user and tenant info
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    // Save the user message to database
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      try {
        await createMessage({
          conversation_id: conversationId,
          role: lastUserMessage.role,
          content: lastUserMessage.content,
          metadata: { model, temperature },
        });
        console.log('Saved user message to database');
      } catch (error) {
        console.error('Failed to save user message:', error);
        // Continue anyway - don't block the chat
      }
    }

    // Add system message for chatbot context
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are a helpful, knowledgeable, and friendly AI assistant. You provide accurate, detailed, and well-structured responses. Always be respectful and maintain a conversational tone. If you're unsure about something, acknowledge your uncertainty rather than guessing.`
    };

    const apiMessages = [systemMessage, ...messages];

    // Get API key
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      throw new Error('ABACUSAI_API_KEY is not configured');
    }

    console.log('Calling Abacus.AI API...');

    // Call the LLM API with streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', response.status, response.statusText, errorText);
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    console.log('Abacus.AI API response received, starting stream...');

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error('No response body'));
          return;
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let partialRead = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Save assistant response to database
                  if (buffer.trim()) {
                    try {
                      await createMessage({
                        conversation_id: conversationId,
                        role: 'assistant',
                        content: buffer,
                        metadata: { 
                          model, 
                          temperature, 
                          tokens: buffer.split(' ').length,
                          timestamp: new Date().toISOString()
                        },
                      });

                      // Update conversation updated_at
                      await updateConversation(conversationId, tenantUser.tenant_id, {
                        updated_at: new Date().toISOString()
                      });

                      console.log('Saved assistant response to database');
                    } catch (error) {
                      console.error('Failed to save assistant message:', error);
                    }
                  }

                  // Send final result
                  const finalData = JSON.stringify({
                    status: 'completed',
                    result: {
                      content: buffer,
                      conversationId,
                      timestamp: new Date().toISOString(),
                    }
                  });
                  controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    buffer += content;
                    
                    // Send the actual content chunk for streaming
                    const contentData = JSON.stringify({
                      status: 'streaming',
                      content: content
                    });
                    controller.enqueue(encoder.encode(`data: ${contentData}\n\n`));
                  } else {
                    // Send progress update when no content
                    const progressData = JSON.stringify({
                      status: 'processing',
                      message: 'Generating response...'
                    });
                    controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          const errorData = JSON.stringify({
            status: 'error',
            error: error instanceof Error ? error.message : 'Stream processing failed'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
