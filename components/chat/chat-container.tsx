
'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, ChatSession, ChatState } from '@/lib/types';
import { createMessage, processStreamingResponse, generateSessionTitle } from '@/lib/chat-utils';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ChatHeader } from './chat-header';
import { SessionSidebar } from './session-sidebar';
import toast from 'react-hot-toast';

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [progress, setProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const createNewSession = (): ChatSession => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      isActive: true,
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
    setMessages([]);
    
    return newSession;
  };

  const updateSessionTitle = (session: ChatSession, firstMessage: string) => {
    const title = generateSessionTitle(firstMessage);
    const updatedSession = { ...session, title, updatedAt: new Date() };
    
    setSessions(prev => 
      prev.map(s => s.id === session.id ? updatedSession : s)
    );
    setCurrentSession(updatedSession);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || chatState === 'processing') return;

    let session = currentSession;
    if (!session) {
      session = createNewSession();
    }

    const userMessage = createMessage(content, 'user', session.id);
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setChatState('processing');
    setProgress(0);

    // Update session title if this is the first message
    if (newMessages.length === 1) {
      updateSessionTitle(session, content);
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
          sessionId: session.id,
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
          const assistantMessage = createMessage(
            result.content || result,
            'assistant',
            session?.id || 'unknown'
          );
          setMessages(prev => [...prev, assistantMessage]);
          setChatState('completed');
          setProgress(100);
          
          // Update session
          if (session) {
            const updatedSession: ChatSession = {
              ...session,
              messages: [...newMessages, assistantMessage],
              updatedAt: new Date(),
            };
            setSessions(prev => 
              prev.map(s => s.id === session?.id ? updatedSession : s)
            );
          }
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

  const selectSession = (session: ChatSession) => {
    setCurrentSession(session);
    setMessages(session.messages);
    setChatState('idle');
    setSidebarOpen(false);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setMessages([]);
      setChatState('idle');
    }
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 relative rounded-lg overflow-hidden">
      <SessionSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onNewChat={createNewSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          currentSession={currentSession}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={createNewSession}
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
          disabled={chatState === 'processing'}
          isLoading={chatState === 'processing'}
        />
      </div>
    </div>
  );
}
