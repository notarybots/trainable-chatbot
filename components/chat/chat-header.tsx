
'use client';

import { ChatSession } from '@/lib/types';
import { Menu, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  currentSession: ChatSession | null;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

export function ChatHeader({ currentSession, onToggleSidebar, onNewChat }: ChatHeaderProps) {
  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentSession?.title || 'Trainable Chatbot'}
            </h1>
          </div>
        </div>
        
        <Button
          onClick={onNewChat}
          className="bg-blue-500 hover:bg-blue-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Chat
        </Button>
      </div>
    </header>
  );
}
