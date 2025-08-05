
'use client';

import { Message, ChatState } from '@/lib/types';
import { formatTimestamp } from '@/lib/chat-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Loader2 } from 'lucide-react';
import { RefObject } from 'react';

interface MessageListProps {
  messages: Message[];
  chatState: ChatState;
  progress: number;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function MessageList({ messages, chatState, progress, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user'
                    ? 'text-blue-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
            
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {chatState === 'processing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start space-x-3"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-gray-600 dark:text-gray-300">
                Thinking... {progress}%
              </span>
            </div>
            {progress > 0 && (
              <div className="mt-2 w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
