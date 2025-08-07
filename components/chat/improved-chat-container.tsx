
'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, Conversation, ChatState } from '@/lib/types';
import { generateSessionTitle } from '@/lib/chat-utils';
import { useSupabase } from '@/lib/providers/supabase-provider';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ChatHeader } from './chat-header';
import { SessionSidebar } from './session-sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export function ImprovedChatContainer() {
  const { isAuthenticated, loading: authLoading, user, refreshSession } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [progress, setProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on auth
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      setSessionError(false);
      setError(null);
      loadConversations();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, user]);

  const loadConversations = async () => {
    if (!isAuthenticated || !user) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/conversations');
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else if (response.status === 401) {
        if (!isAuthenticated || !user) {
          setSessionError(true);
          setError('Session expired - please sign in again');
          toast.error('Session expired. Please sign in again.');
        } else {
          setConversations([]);
          toast('Database setup required. Contact administrator.', { icon: '⚠️' });
        }
      } else {
        setConversations([]);
        toast.error('Failed to load conversations - you can still start a new chat');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
      toast.error('Failed to load conversations - you can still start a new chat');
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async (): Promise<Conversation | null> => {
    if (!isAuthenticated || !user) {
      toast.error('Please sign in to create a conversation');
      return null;
    }

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Conversation',
          metadata: {},
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        setMessages([]);
        return newConversation;
      } else {
        toast.error('Failed to create new conversation');
        return null;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new conversation');
      return null;
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || chatState === 'processing') return;

    if (!isAuthenticated) {
      toast.error('Please sign in to send messages');
      return;
    }

    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createNewConversation();
      if (!conversation) return;
    }

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      created_at: new Date().toISOString(),
      conversation_id: conversation.id,
      metadata: {},
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setChatState('processing');
    setProgress(0);
    setIsStreaming(false);
    setStreamingContent('');

    // Update conversation title if this is the first message
    if (newMessages.length === 1) {
      const title = generateSessionTitle(content);
      try {
        await fetch(`/api/conversations/${conversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
      } catch (error) {
        console.error('Error updating conversation title:', error);
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          conversationId: conversation.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      setIsStreaming(true);
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
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.status === 'processing') {
                  setProgress(prev => Math.min(prev + 1, 99));
                } else if (parsed.status === 'completed') {
                  const assistantMessage: Message = {
                    id: crypto.randomUUID(),
                    content: parsed.result?.content || parsed.result,
                    role: 'assistant',
                    created_at: new Date().toISOString(),
                    conversation_id: conversation!.id,
                    metadata: parsed.result?.metadata || {},
                  };
                  
                  setMessages(prev => [...prev, assistantMessage]);
                  setChatState('completed');
                  setProgress(100);
                  setIsStreaming(false);
                  setStreamingContent('');
                  loadConversations(); // Refresh list
                  return;
                } else if (parsed.status === 'error') {
                  throw new Error(parsed.error || 'Generation failed');
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        throw error;
      }
    } catch (error) {
      setChatState('error');
      setIsStreaming(false);
      setStreamingContent('');
      toast.error('Failed to send message. Please try again.');
      console.error('Chat error:', error);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversation(data);
        setMessages(data.messages || []);
        setChatState('idle');
        setSidebarOpen(false);
      } else {
        toast.error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
          setChatState('idle');
        }
        toast.success('Conversation deleted');
      } else {
        toast.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  // Show loading states
  if (authLoading) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  if (sessionError && (!isAuthenticated || !user)) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden items-center justify-center">
        <Card className="w-full max-w-sm mx-4">
          <CardContent className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Session Expired</h3>
            <p className="text-gray-600 mb-4">
              Your session has expired. Please refresh to continue.
            </p>
            <Button onClick={async () => {
              await refreshSession();
              setSessionError(false);
            }} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Loading conversations...
          </p>
        </div>
      </div>
    );
  }

  // Convert conversations to legacy format for compatibility
  const legacySessions = conversations.map(conv => ({
    ...conv,
    userId: conv.user_id,
    createdAt: new Date(conv.created_at),
    updatedAt: new Date(conv.updated_at),
    isActive: currentConversation?.id === conv.id,
    messages: conv.messages || [],
  }));

  const currentLegacySession = currentConversation ? {
    ...currentConversation,
    userId: currentConversation.user_id,
    createdAt: new Date(currentConversation.created_at),
    updatedAt: new Date(currentConversation.updated_at),
    isActive: true,
    messages: messages,
  } : null;

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden">
      <SessionSidebar
        sessions={legacySessions}
        currentSession={currentLegacySession}
        onSelectSession={selectConversation}
        onDeleteSession={deleteConversation}
        onNewChat={createNewConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          currentSession={currentLegacySession}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={createNewConversation}
        />
        
        <div className="flex-1 min-h-0">
          <MessageList
            messages={messages}
            chatState={chatState}
            progress={progress}
            messagesEndRef={messagesEndRef}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
          />
        </div>
        
        <MessageInput
          onSendMessage={sendMessage}
          disabled={!isAuthenticated}
          isLoading={chatState === 'processing'}
        />
      </div>
    </div>
  );
}
