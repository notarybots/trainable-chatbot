
'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';
import { useSupabase } from '@/lib/providers/supabase-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SimpleMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export function AIChatContainer() {
  console.log('🤖 AIChatContainer: Component mounted');
  
  const { isAuthenticated, user, loading: authLoading } = useSupabase();
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log('📊 AIChatContainer: State', {
    messagesCount: messages.length,
    inputValue: inputValue.substring(0, 20) + (inputValue.length > 20 ? '...' : ''),
    isProcessing,
    isStreaming,
    streamingContent: streamingContent.substring(0, 30) + (streamingContent.length > 30 ? '...' : ''),
    isAuthenticated,
    userExists: !!user,
    authLoading
  });

  // Scroll to bottom when messages or streaming content changes
  useEffect(() => {
    console.log('📜 AIChatContainer: Scrolling to bottom');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Create a new conversation when needed
  const createConversation = async (): Promise<string | null> => {
    console.log('🆕 AIChatContainer: Creating new conversation');
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chat',
          metadata: {},
        }),
      });

      if (response.ok) {
        const conversation = await response.json();
        console.log('✅ AIChatContainer: Conversation created', conversation.id);
        return conversation.id;
      } else {
        console.error('❌ AIChatContainer: Failed to create conversation', response.status);
        // Don't fail completely, we'll create a temporary ID
        const tempId = `temp-${Date.now()}`;
        console.log('🔄 AIChatContainer: Using temporary conversation ID:', tempId);
        return tempId;
      }
    } catch (error) {
      console.error('❌ AIChatContainer: Error creating conversation:', error);
      const tempId = `temp-${Date.now()}`;
      console.log('🔄 AIChatContainer: Using temporary conversation ID:', tempId);
      return tempId;
    }
  };

  // Handle AI response streaming
  const handleAIResponse = async (userMessage: string, currentConversationId: string): Promise<void> => {
    console.log('🤖 AIChatContainer: Starting AI response for:', userMessage);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: 'user', content: userMessage }
          ],
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('📡 AIChatContainer: Starting to process streaming response');
      setIsStreaming(true);
      setStreamingContent('');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
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
                console.log('📡 AIChatContainer: Streaming completed');
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.status === 'processing') {
                  // Just continue processing, no specific action needed
                  console.log('⚡ AIChatContainer: Processing...');
                } else if (parsed.status === 'streaming') {
                  // Handle real-time content streaming
                  const newContent = parsed.content || '';
                  if (newContent) {
                    setStreamingContent(prev => prev + newContent);
                    console.log('📡 AIChatContainer: Streaming chunk:', newContent);
                  }
                } else if (parsed.status === 'completed') {
                  // Use the accumulated streaming content for the final message
                  const finalContent = parsed.result?.content || streamingContent || 'No response received';
                  const aiMessage: SimpleMessage = {
                    id: crypto.randomUUID(),
                    content: finalContent,
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                  };
                  
                  console.log('✅ AIChatContainer: AI response completed:', finalContent.substring(0, 50));
                  
                  setMessages(prev => [...prev, aiMessage]);
                  setIsStreaming(false);
                  setStreamingContent('');
                  return;
                } else if (parsed.status === 'error') {
                  throw new Error(parsed.error || 'AI generation failed');
                }
              } catch (e) {
                console.log('⚠️ AIChatContainer: Skipping invalid JSON in stream');
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ AIChatContainer: Stream processing error:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ AIChatContainer: AI response error:', error);
      
      // Fallback to echo response if AI fails
      console.log('🔄 AIChatContainer: Falling back to echo response');
      const fallbackMessage: SimpleMessage = {
        id: crypto.randomUUID(),
        content: `I apologize, but I encountered an error. Here's what you said: "${userMessage}"`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      setIsStreaming(false);
      setStreamingContent('');
      
      throw error; // Re-throw for error handling in calling function
    }
  };

  // Handle sending message - NOW WITH AI INTEGRATION
  const handleSendMessage = async () => {
    console.log('📤 AIChatContainer: handleSendMessage called');
    console.log('📋 AIChatContainer: Input value:', inputValue);
    
    // Step 1: Validate input
    if (!inputValue.trim()) {
      console.log('⚠️ AIChatContainer: Empty input, aborting');
      return;
    }

    // Step 2: Check if already processing
    if (isProcessing) {
      console.log('⚠️ AIChatContainer: Already processing, aborting');
      return;
    }

    // Step 3: Check authentication
    if (!isAuthenticated) {
      console.log('⚠️ AIChatContainer: Not authenticated');
      toast.error('Please sign in to send messages');
      return;
    }

    const messageContent = inputValue.trim();
    console.log('✅ AIChatContainer: Ready to send message:', messageContent);

    // Step 4: Clear input immediately for better UX
    setInputValue('');
    console.log('🧹 AIChatContainer: Input cleared');

    // Step 5: Create user message and add to UI immediately
    const userMessage: SimpleMessage = {
      id: crypto.randomUUID(),
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    console.log('👤 AIChatContainer: Created user message:', userMessage);
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      console.log('📝 AIChatContainer: Updated messages count:', newMessages.length);
      return newMessages;
    });

    // Step 6: Set processing state
    setIsProcessing(true);
    console.log('⚡ AIChatContainer: Set processing to true');

    try {
      // Step 7: Ensure we have a conversation ID
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        console.log('🔄 AIChatContainer: No conversation ID, creating new one');
        currentConversationId = await createConversation();
        if (!currentConversationId) {
          throw new Error('Failed to create conversation');
        }
        setConversationId(currentConversationId);
        console.log('💾 AIChatContainer: Conversation ID set:', currentConversationId);
      }

      // Step 8: Get AI response instead of echo
      console.log('🤖 AIChatContainer: Requesting AI response...');
      await handleAIResponse(messageContent, currentConversationId);
      
      console.log('✅ AIChatContainer: AI response completed successfully');
      toast.success('Message sent successfully!');

    } catch (error) {
      console.error('❌ AIChatContainer: Error in handleSendMessage:', error);
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      // Step 9: Always reset processing state
      setIsProcessing(false);
      console.log('🔚 AIChatContainer: Set processing to false');
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('⌨️ AIChatContainer: Key pressed:', e.key);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('↩️ AIChatContainer: Enter key detected, calling handleSendMessage');
      handleSendMessage();
    }
  };

  // Show loading state during auth
  if (authLoading) {
    console.log('⏳ AIChatContainer: Showing auth loading state');
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    console.log('🔐 AIChatContainer: Showing login prompt');
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to use the chat.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('🎨 AIChatContainer: Rendering AI chat interface');
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b p-4 bg-gray-50">
        <h2 className="text-lg font-semibold">AI Chat Assistant</h2>
        <p className="text-sm text-gray-600">Phase 2: Real AI responses with streaming</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">AI Assistant Ready</h3>
            <p className="text-gray-600">Ask me anything! I'm powered by real AI.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <Avatar className="w-8 h-8 bg-emerald-500">
                <AvatarFallback className="text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}

            <Card className={`max-w-xs ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
              <CardContent className="p-3">
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>

            {message.role === 'user' && (
              <Avatar className="w-8 h-8 bg-blue-500">
                <AvatarFallback className="text-white">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 justify-start">
            <Avatar className="w-8 h-8 bg-emerald-500">
              <AvatarFallback className="text-white">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="max-w-xs bg-gray-100">
              <CardContent className="p-3">
                <div className="text-sm whitespace-pre-wrap">
                  {streamingContent}
                  <span className="animate-pulse">▊</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && !isStreaming && (
          <div className="flex gap-3 justify-start">
            <Avatar className="w-8 h-8 bg-emerald-500">
              <AvatarFallback className="text-white">
                <Loader2 className="w-4 h-4 animate-spin" />
              </AvatarFallback>
            </Avatar>
            <Card className="max-w-xs bg-gray-100">
              <CardContent className="p-3">
                <div className="text-sm text-gray-600">AI is thinking...</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => {
              console.log('✏️ AIChatContainer: Input changed:', e.target.value.substring(0, 20));
              setInputValue(e.target.value);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything... (Press Enter to send)"
            disabled={isProcessing}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            rows={1}
            style={{
              minHeight: '40px',
              maxHeight: '100px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
            }}
          />
          <Button
            onClick={() => {
              console.log('🖱️ AIChatContainer: Send button clicked');
              handleSendMessage();
            }}
            disabled={!inputValue.trim() || isProcessing}
            className="px-4 py-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Phase 2: Real AI responses with streaming support
        </div>
      </div>
    </div>
  );
}
