
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

export function SimpleChatContainer() {
  console.log('🚀 SimpleChatContainer: Component mounted');
  
  const { isAuthenticated, user, loading: authLoading } = useSupabase();
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log('📊 SimpleChatContainer: State', {
    messagesCount: messages.length,
    inputValue: inputValue.substring(0, 20) + (inputValue.length > 20 ? '...' : ''),
    isProcessing,
    isAuthenticated,
    userExists: !!user,
    authLoading
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    console.log('📜 SimpleChatContainer: Scrolling to bottom');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create a new conversation when needed
  const createConversation = async (): Promise<string | null> => {
    console.log('🆕 SimpleChatContainer: Creating new conversation');
    
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
        console.log('✅ SimpleChatContainer: Conversation created', conversation.id);
        return conversation.id;
      } else {
        console.error('❌ SimpleChatContainer: Failed to create conversation', response.status);
        toast.error('Failed to create conversation');
        return null;
      }
    } catch (error) {
      console.error('❌ SimpleChatContainer: Error creating conversation:', error);
      toast.error('Error creating conversation');
      return null;
    }
  };

  // Handle sending message - STEP BY STEP with logging
  const handleSendMessage = async () => {
    console.log('📤 SimpleChatContainer: handleSendMessage called');
    console.log('📋 SimpleChatContainer: Input value:', inputValue);
    
    // Step 1: Validate input
    if (!inputValue.trim()) {
      console.log('⚠️ SimpleChatContainer: Empty input, aborting');
      return;
    }

    // Step 2: Check if already processing
    if (isProcessing) {
      console.log('⚠️ SimpleChatContainer: Already processing, aborting');
      return;
    }

    // Step 3: Check authentication
    if (!isAuthenticated) {
      console.log('⚠️ SimpleChatContainer: Not authenticated');
      toast.error('Please sign in to send messages');
      return;
    }

    const messageContent = inputValue.trim();
    console.log('✅ SimpleChatContainer: Ready to send message:', messageContent);

    // Step 4: Clear input immediately for better UX
    setInputValue('');
    console.log('🧹 SimpleChatContainer: Input cleared');

    // Step 5: Create user message and add to UI immediately
    const userMessage: SimpleMessage = {
      id: crypto.randomUUID(),
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    console.log('👤 SimpleChatContainer: Created user message:', userMessage);
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      console.log('📝 SimpleChatContainer: Updated messages count:', newMessages.length);
      return newMessages;
    });

    // Step 6: Set processing state
    setIsProcessing(true);
    console.log('⚡ SimpleChatContainer: Set processing to true');

    try {
      // Step 7: Ensure we have a conversation ID
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        console.log('🔄 SimpleChatContainer: No conversation ID, creating new one');
        currentConversationId = await createConversation();
        if (!currentConversationId) {
          throw new Error('Failed to create conversation');
        }
        setConversationId(currentConversationId);
        console.log('💾 SimpleChatContainer: Conversation ID set:', currentConversationId);
      }

      // Step 8: Start with simple echo response (before AI integration)
      console.log('🔄 SimpleChatContainer: Adding echo response for testing');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const echoMessage: SimpleMessage = {
        id: crypto.randomUUID(),
        content: `Echo: ${messageContent}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      console.log('🤖 SimpleChatContainer: Created echo response:', echoMessage);
      setMessages(prev => {
        const newMessages = [...prev, echoMessage];
        console.log('📝 SimpleChatContainer: Updated messages count after echo:', newMessages.length);
        return newMessages;
      });

      console.log('✅ SimpleChatContainer: Echo response completed');
      toast.success('Message sent successfully!');

    } catch (error) {
      console.error('❌ SimpleChatContainer: Error in handleSendMessage:', error);
      toast.error('Failed to send message');
    } finally {
      // Step 9: Always reset processing state
      setIsProcessing(false);
      console.log('🔚 SimpleChatContainer: Set processing to false');
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('⌨️ SimpleChatContainer: Key pressed:', e.key);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('↩️ SimpleChatContainer: Enter key detected, calling handleSendMessage');
      handleSendMessage();
    }
  };

  // Show loading state during auth
  if (authLoading) {
    console.log('⏳ SimpleChatContainer: Showing auth loading state');
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
    console.log('🔐 SimpleChatContainer: Showing login prompt');
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

  console.log('🎨 SimpleChatContainer: Rendering chat interface');
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b p-4 bg-gray-50">
        <h2 className="text-lg font-semibold">Simple Chat</h2>
        <p className="text-sm text-gray-600">Testing basic message flow</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Ready to Chat</h3>
            <p className="text-gray-600">Type a message below to start testing!</p>
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

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <Avatar className="w-8 h-8 bg-emerald-500">
              <AvatarFallback className="text-white">
                <Loader2 className="w-4 h-4 animate-spin" />
              </AvatarFallback>
            </Avatar>
            <Card className="max-w-xs bg-gray-100">
              <CardContent className="p-3">
                <div className="text-sm text-gray-600">Thinking...</div>
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
              console.log('✏️ SimpleChatContainer: Input changed:', e.target.value.substring(0, 20));
              setInputValue(e.target.value);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send)"
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
              console.log('🖱️ SimpleChatContainer: Send button clicked');
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
          Phase 1: Testing basic message flow with echo responses
        </div>
      </div>
    </div>
  );
}
