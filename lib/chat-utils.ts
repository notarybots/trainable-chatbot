
import { Message, StreamingResponse } from './types';

export const createMessage = (
  content: string,
  role: 'user' | 'assistant' | 'system',
  sessionId: string,
  userId?: string
): Message => ({
  id: crypto.randomUUID(),
  content,
  role,
  timestamp: new Date(),
  sessionId,
  userId,
});

export const formatMessageForAPI = (message: Message) => ({
  role: message.role,
  content: message.content,
});

export const processStreamingResponse = async (
  response: Response,
  onProgress?: (progress: number) => void,
  onComplete?: (result: any) => void,
  onError?: (error: string) => void
) => {
  if (!response.body) {
    onError?.('No response body');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let partialRead = '';
  let progress = 0;

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
            const parsed: StreamingResponse = JSON.parse(data);
            
            if (parsed.status === 'processing') {
              progress = Math.min(progress + 1, 99);
              onProgress?.(progress);
            } else if (parsed.status === 'completed') {
              onComplete?.(parsed.result);
              return;
            } else if (parsed.status === 'error') {
              onError?.(parsed.error || 'Generation failed');
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error.message : 'Stream processing failed');
  }
};

export const generateSessionTitle = (firstMessage: string): string => {
  const words = firstMessage.split(' ').slice(0, 6);
  return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
};

export const formatTimestamp = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return timestamp.toLocaleDateString();
};
