
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
  conversation_id: string;
  metadata?: {
    model?: string;
    tokens?: number;
    processing_time?: number;
    timestamp?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  metadata?: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
  };
}

// Legacy types for backward compatibility
export interface ChatSession extends Conversation {
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  sessions: ChatSession[];
}

export interface StreamingResponse {
  status: 'processing' | 'completed' | 'error';
  message?: string;
  result?: any;
  error?: string;
}

export interface ChatConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}

export type ChatState = 'idle' | 'typing' | 'processing' | 'streaming' | 'completed' | 'error';
