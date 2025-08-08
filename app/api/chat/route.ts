
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getDefaultLLMService } from '@/lib/ai';
import { AIMessage } from '@/lib/ai/types/common';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  sessionId: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: NextRequest) {
  let llmService: any = null;
  
  try {
    const body: ChatRequest = await request.json();
    const { messages, sessionId, model = 'gpt-4.1-mini', temperature = 0.7, maxTokens = 3000 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TEMPORARY FIX: Force fallback to direct API call to bypass AI abstraction layer issues
    console.log('Forcing fallback to direct API call to fix "Just now" issue');
    return fallbackToDirectAPI(request);

    // Get LLM service from AI abstraction layer
    llmService = await getDefaultLLMService();

    // Add system message for chatbot context
    const systemMessage: AIMessage = {
      role: 'system',
      content: `You are a helpful, knowledgeable, and friendly AI assistant. You provide accurate, detailed, and well-structured responses. Always be respectful and maintain a conversational tone. If you're unsure about something, acknowledge your uncertainty rather than guessing.`
    };

    // Convert messages to AI abstraction format
    const aiMessages: AIMessage[] = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role as any,
        content: msg.content,
      }))
    ];

    // Use streaming from AI abstraction layer
    const streamResponse = await llmService.chatStream(aiMessages, model, {
      temperature,
      maxTokens,
    });

    // Create compatible streaming response that maintains exact format
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = '';

        try {
          for await (const chunk of streamResponse) {
            const content = chunk.choices?.[0]?.delta?.content || '';
            if (content) {
              buffer += content;
            }

            // Send progress update (maintains existing format)
            const progressData = JSON.stringify({
              status: 'processing',
              message: 'Generating response...'
            });
            controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
          }

          // Send final result (maintains existing format)
          const finalData = JSON.stringify({
            status: 'completed',
            result: {
              content: buffer,
              sessionId,
              timestamp: new Date().toISOString(),
            }
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.close();
          
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
    
    // If AI abstraction fails, fallback to direct API call
    if (error instanceof Error && error.message.includes('No API key found')) {
      console.warn('AI abstraction not available, falling back to direct API call');
      return fallbackToDirectAPI(request);
    }

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

// Fallback function to maintain compatibility if abstraction fails
async function fallbackToDirectAPI(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, sessionId, model = 'gpt-4.1-mini', temperature = 0.7, maxTokens = 3000 } = body;

    // Add system message for chatbot context
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are a helpful, knowledgeable, and friendly AI assistant. You provide accurate, detailed, and well-structured responses. Always be respectful and maintain a conversational tone. If you're unsure about something, acknowledge your uncertainty rather than guessing.`
    };

    const apiMessages = [systemMessage, ...messages];

    // Call the LLM API with streaming (original implementation)
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
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
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    // Create streaming response (original implementation)
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
                  const finalData = JSON.stringify({
                    status: 'completed',
                    result: {
                      content: buffer,
                      sessionId,
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
                  }

                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'Generating response...'
                  });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
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
    console.error('Fallback API error:', error);
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
