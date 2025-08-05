
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  sessionId: string;
  userId?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    processing_time?: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  isActive: boolean;
  metadata?: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
  };
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
