

'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, Conversation, ChatState } from '@/lib/types';
import { processStreamingResponse, generateSessionTitle } from '@/lib/chat-utils';
import { useSupabase } from '@/lib/providers/supabase-provider';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ChatHeader } from './chat-header';
import { SessionSidebar } from './session-sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export function ChatContainer() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);

  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current && (isAutoScrolling.current || force)) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  // Enhanced session validation
  const validateSession = async () => {
    if (!isAuthenticated) {
      setSessionError(true)
      return false
    }

    try {
      const response = await fetch('/api/conversations')
      if (response.status === 401) {
        console.warn('Session validation failed - 401 Unauthorized')
        setSessionError(true)
        return false
      }
      setSessionError(false)
      return true
    } catch (error) {
      console.error('Session validation error:', error)
      setSessionError(true)
      return false
    }
  }

  // Load conversations with enhanced error handling
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadConversations();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // Enhanced scroll management
  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  useEffect(() => {
    if (chatState === 'processing') {
      scrollToBottom(true);
    }
  }, [chatState]);

  const loadConversations = async () => {
    if (!isAuthenticated) {
      console.warn('Attempted to load conversations without authentication');
      setError('Authentication required')
      return;
    }

    // Validate session first
    const sessionValid = await validateSession()
    if (!sessionValid) {
      setError('Session expired - please refresh')
      return
    }

    try {
      setError(null);
      const response = await fetch('/api/conversations');
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
        console.log(`Loaded ${data?.length || 0} conversations`);
      } else if (response.status === 401) {
        console.error('Unauthorized access to conversations');
        setSessionError(true)
        setError('Session expired - please sign in again');
        toast.error('Session expired. Please sign in again.');
      } else {
        console.error('Failed to load conversations:', response.status);
        toast.error('Failed to load conversations');
        setError('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to access conversations');
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversation(data);
        setMessages(data.messages || []);
      } else if (response.status === 401) {
        setSessionError(true)
        toast.error('Session expired. Please sign in again.');
      } else {
        console.error('Failed to load conversation');
        toast.error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const createNewConversation = async (): Promise<Conversation | null> => {
    if (!isAuthenticated) {
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
        console.log('Created new conversation:', newConversation.id);
        return newConversation;
      } else if (response.status === 401) {
        setSessionError(true)
        toast.error('Session expired. Please sign in again.');
        return null;
      } else {
        console.error('Failed to create conversation');
        toast.error('Failed to create new conversation');
        return null;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new conversation');
      return null;
    }
  };

  const updateConversationTitle = async (conversation: Conversation, firstMessage: string) => {
    const title = generateSessionTitle(firstMessage);
    
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const updatedConversation = await response.json();
        setConversations(prev => 
          prev.map(c => c.id === conversation.id ? updatedConversation : c)
        );
        setCurrentConversation(updatedConversation);
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
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

    // Create temporary user message for immediate UI update
    const tempUserMessage: Message = {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      created_at: new Date().toISOString(),
      conversation_id: conversation.id,
      metadata: {},
    };

    const newMessages = [...messages, tempUserMessage];
    setMessages(newMessages);
    setChatState('processing');
    setProgress(0);

    // Update conversation title if this is the first message
    if (newMessages.length === 1) {
      updateConversationTitle(conversation, content);
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
        const errorText = await response.text();
        console.error('Chat API Error:', response.status, response.statusText, errorText);
        
        if (response.status === 401) {
          setSessionError(true)
          toast.error('Session expired. Please sign in again.');
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      await processStreamingResponse(
        response,
        (progressValue) => {
          setProgress(progressValue);
        },
        (result) => {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            content: result.content || result,
            role: 'assistant',
            created_at: new Date().toISOString(),
            conversation_id: conversation?.id || 'unknown',
            metadata: result.metadata || {},
          };
          setMessages(prev => [...prev, assistantMessage]);
          setChatState('completed');
          setProgress(100);
          
          // Refresh conversations list to show updated timestamp
          loadConversations();
        },
        (error) => {
          setChatState('error');
          toast.error(`Error: ${error}`);
        }
      );
    } catch (error) {
      setChatState('error');
      toast.error('Failed to send message. Please try again.');
      console.error('Chat error:', error);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    loadConversation(conversation.id);
    setChatState('idle');
    setSidebarOpen(false);
  };

  const deleteConversationHandler = async (conversationId: string) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to delete conversations');
      return;
    }

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
      } else if (response.status === 401) {
        setSessionError(true)
        toast.error('Session expired. Please sign in again.');
      } else {
        toast.error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleRefreshSession = async () => {
    try {
      await refreshSession()
      setSessionError(false)
      setError(null)
      // Retry loading conversations
      loadConversations()
      toast.success('Session refreshed successfully')
    } catch (error) {
      console.error('Failed to refresh session:', error)
      toast.error('Failed to refresh session')
    }
  }

  // Show authentication loading state
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

  // Show unauthenticated state - Let route guards handle authentication
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

  // Show session error state
  if (sessionError) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden items-center justify-center">
        <Card className="w-full max-w-sm mx-4">
          <CardContent className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Session Expired</h3>
            <p className="text-gray-600 mb-4">
              Your session has expired. Please refresh to continue.
            </p>
            <Button onClick={handleRefreshSession} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
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

  // Show error state
  if (error) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden items-center justify-center">
        <Card className="w-full max-w-sm mx-4">
          <CardContent className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Chat</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2">
              {sessionError && (
                <Button onClick={handleRefreshSession} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
              <Button 
                onClick={() => {
                  setError(null);
                  loadConversations();
                }}
                className={sessionError ? "flex-1" : "w-full"}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert conversations to legacy ChatSession format for backward compatibility
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
        onDeleteSession={deleteConversationHandler}
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
          />
        </div>
        
        <MessageInput
          onSendMessage={sendMessage}
          disabled={chatState === 'processing' || loading || !isAuthenticated || sessionError}
          isLoading={chatState === 'processing'}
        />
      </div>
    </div>
  );
}
