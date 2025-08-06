
'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, Conversation, ChatState } from '@/lib/types';
import { processStreamingResponse, generateSessionTitle } from '@/lib/chat-utils';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ChatHeader } from './chat-header';
import { SessionSidebar } from './session-sidebar';
import toast from 'react-hot-toast';

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [progress, setProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Enhanced scroll management
  useEffect(() => {
    // Always scroll to bottom when new messages arrive
    scrollToBottom(true);
  }, [messages]);

  // Enhanced scroll behavior for processing state
  useEffect(() => {
    if (chatState === 'processing') {
      // Ensure we're at the bottom when starting to process
      scrollToBottom(true);
    }
  }, [chatState]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        console.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversation(data);
        setMessages(data.messages || []);
      } else {
        console.error('Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const createNewConversation = async (): Promise<Conversation | null> => {
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

  if (loading) {
    return (
      <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

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
          disabled={chatState === 'processing' || loading}
          isLoading={chatState === 'processing'}
        />
      </div>
    </div>
  );
}
