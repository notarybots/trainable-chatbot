
'use client';

import { useRef, useEffect } from 'react';
import { Message, ChatState } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, User, Bot, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatTimestamp } from '@/lib/chat-utils';

interface MessageListProps {
  messages: Message[];
  chatState: ChatState;
  progress?: number;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function MessageList({ 
  messages, 
  chatState, 
  progress = 0, 
  messagesEndRef,
  isStreaming = false,
  streamingContent = ''
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef?.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, messagesEndRef, isStreaming, streamingContent]);

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getAvatarBg = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-500';
      case 'assistant':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-6"
    >
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 && chatState === 'idle' && (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              Welcome to your AI Assistant
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
              Start a conversation by typing a message below. I'm here to help with any questions or tasks!
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role !== 'user' && (
              <Avatar className={`w-8 h-8 ${getAvatarBg(message.role)} shrink-0`}>
                <AvatarFallback className="text-white">
                  {getMessageIcon(message.role)}
                </AvatarFallback>
              </Avatar>
            )}
            
            <Card className={`max-w-3xl ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800'}`}>
              <CardContent className="p-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
                
                {message.created_at && (
                  <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatTimestamp(message.created_at)}
                  </div>
                )}
              </CardContent>
            </Card>

            {message.role === 'user' && (
              <Avatar className="w-8 h-8 bg-blue-500 shrink-0">
                <AvatarFallback className="text-white">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {/* Show streaming response */}
        {isStreaming && streamingContent && (
          <div className="flex gap-4 justify-start">
            <Avatar className="w-8 h-8 bg-emerald-500 shrink-0">
              <AvatarFallback className="text-white">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            
            <Card className="max-w-3xl bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap break-words">
                    {streamingContent}
                    <span className="animate-pulse">▊</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Show processing state */}
        {chatState === 'processing' && !isStreaming && (
          <div className="flex gap-4 justify-start">
            <Avatar className="w-8 h-8 bg-emerald-500 shrink-0">
              <AvatarFallback className="text-white">
                <Bot className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            
            <Card className="max-w-3xl bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    AI is thinking...
                  </span>
                </div>
                
                {progress > 0 && (
                  <div className="mt-3">
                    <Progress value={progress} className="h-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {chatState === 'error' && (
          <div className="flex gap-4 justify-start">
            <Avatar className="w-8 h-8 bg-red-500 shrink-0">
              <AvatarFallback className="text-white">
                <AlertCircle className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            
            <Card className="max-w-3xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <div className="text-red-800 dark:text-red-200">
                  <strong>Error:</strong> Failed to get response. Please try again.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
