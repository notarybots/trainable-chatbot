
# AI Abstraction Layer

A comprehensive, provider-agnostic AI service abstraction layer for Node.js applications with TypeScript support.

## Overview

The AI Abstraction Layer provides a unified interface for interacting with multiple AI service providers including OpenAI, Anthropic, Cohere, Voyage AI, Abacus.AI, and custom providers. It features robust error handling, configuration management, streaming support, and enterprise-grade reliability patterns.

## Features

- 🔄 **Multi-Provider Support**: OpenAI, Anthropic, Cohere, Voyage AI, Abacus.AI, and custom providers
- ⚡ **Streaming Support**: Real-time streaming for chat and text generation
- 🛡️ **Error Handling**: Comprehensive error recovery, retry strategies, and circuit breakers
- ⚙️ **Configuration Management**: Environment-based configuration with validation
- 🎯 **Type Safety**: Full TypeScript support with strict typing
- 📊 **Monitoring**: Built-in metrics, analytics, and health monitoring
- 🔧 **Extensible**: Plugin architecture for custom providers and middleware
- 🏢 **Multi-Tenant**: Built-in support for multi-tenant architectures

## Quick Start

### Installation

```bash
# The abstraction layer is included in your project
# No additional installation required
```

### Basic Usage

```typescript
import { ConfigFactory, AIFactory, LLMService } from './lib/ai';

// Create configuration
const config = ConfigFactory.openai.llm('your-api-key', {
  defaultModel: 'gpt-4',
  defaultTemperature: 0.7,
  streamingSupported: true
});

// Create service factory
const factory = new AIFactory();

// Create LLM service
const llmService = await factory.createService<LLMService>('llm', 'openai', config);

// Generate text
const response = await llmService.generate({
  messages: [{ role: 'user', content: 'Hello, world!' }],
  maxTokens: 100,
  temperature: 0.7
});

console.log(response.data?.choices[0]?.message.content);
```

### Streaming Example

```typescript
// Create streaming request
const stream = await llmService.generateStream({
  messages: [{ role: 'user', content: 'Write a story about AI' }],
  streamingOptions: {
    onProgress: (status, data) => console.log('Progress:', status),
    onComplete: (result) => console.log('Complete:', result)
  }
});

// Process stream
for await (const chunk of stream) {
  console.log(chunk.choices[0]?.delta?.content);
}
```

## Architecture

### Core Components

1. **Interfaces**: Define contracts for AI services (`interfaces/`)
2. **Types**: Common types and configurations (`types/`)
3. **Error Handling**: Comprehensive error management (`error-handling/`)
4. **Configuration**: Environment-based config management (`config/`)
5. **Factories**: Service creation and management (`interfaces/factory.ts`)

### Service Types

- **LLM Service**: Text generation, chat completion, function calling
- **Embeddings Service**: Text embeddings, semantic search, classification
- **Chat Service**: High-level conversational AI with RAG support

## Configuration

### Environment Variables

```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-api03-...
VOYAGEAI_API_KEY=pa-...
COHERE_API_KEY=...
ABACUSAI_API_KEY=...

# Global Settings
AI_TIMEOUT=30000
AI_RETRY_ATTEMPTS=3
AI_ENABLE_METRICS=true
AI_ENABLE_CACHING=false
AI_LOG_LEVEL=info
```

### Configuration Files

```json
// ai-config.json
{
  "openai": {
    "llm": {
      "apiKey": "sk-...",
      "defaultModel": "gpt-4",
      "defaultTemperature": 0.7,
      "streamingSupported": true
    }
  },
  "global": {
    "timeout": 30000,
    "retryAttempts": 3,
    "enableMetrics": true
  }
}
```

### Programmatic Configuration

```typescript
import { ConfigFactory, ConfigUtils } from './lib/ai/config';

// Using factory
const config = ConfigFactory.openai.llm('your-api-key', {
  defaultModel: 'gpt-4',
  defaultTemperature: 0.7
});

// Using builder pattern
const builderConfig = ConfigFactory.builder('openai', 'llm')
  .apiKey('your-api-key')
  .model('gpt-4')
  .temperature(0.7)
  .streaming(true)
  .build();

// Load from environment
const envConfig = await ConfigUtils.loadConfig('openai', 'llm', {
  environment: 'production',
  validateConfig: true
});
```

## Error Handling

### Automatic Retry

```typescript
import { RetryStrategies, withRetry } from './lib/ai/error-handling';

// Use pre-configured retry strategy
const service = await factory.createService('llm', 'openai', config, {
  retryStrategy: RetryStrategies.aggressive
});

// Custom retry configuration
const customRetry = new RetryStrategy({
  maxAttempts: 5,
  baseDelay: 2000,
  backoffMultiplier: 2,
  jitter: true
});
```

### Circuit Breaker

```typescript
import { CircuitBreaker, withCircuitBreaker } from './lib/ai/error-handling';

// Apply circuit breaker to service
class MyLLMService {
  @withCircuitBreaker({ failureThreshold: 5, resetTimeout: 60000 })
  async generate(request: LLMGenerationRequest) {
    // Service implementation
  }
}
```

### Error Recovery

```typescript
import { ErrorRecoveryManager, globalRecoveryManager } from './lib/ai/error-handling';

// Use global recovery manager
const result = await globalRecoveryManager.recover(
  error,
  originalOperation,
  {
    service: llmService,
    provider: 'openai',
    serviceType: 'llm',
    fallbackServices: [anthropicService, cohereService]
  }
);

if (result.success) {
  console.log('Recovered successfully:', result.data);
} else {
  console.error('Recovery failed:', result.error);
}
```

## Multi-Provider Setup

### Load Balancing

```typescript
import { MultiProviderFactory } from './lib/ai/config';

// Create multi-provider configuration
const multiConfig = ConfigFactory.multiProvider('llm', 'openai', ['anthropic', 'cohere']);

// Create load-balanced service
const balancedService = await factory.createLoadBalancedService([
  openaiConfig,
  anthropicConfig,
  cohereConfig
], 'weighted');
```

### Failover Configuration

```typescript
const chatConfig = ConfigFactory.createChatConfig('openai', 'voyageai', {
  systemPrompt: 'You are a helpful assistant.',
  memoryStrategy: 'sliding_window',
  enableRAG: true,
  streamingEnabled: true
});
```

## Monitoring and Analytics

### Metrics Collection

```typescript
import { globalErrorTracker, ErrorAnalyzer } from './lib/ai/error-handling';

// Get error statistics
const stats = globalErrorTracker.getStatistics(24); // Last 24 hours
console.log('Error rate:', stats.errorRate);
console.log('Errors by provider:', stats.errorsByProvider);

// Analyze specific error
const analysis = ErrorAnalyzer.analyzeError(error);
console.log('Suggested action:', analysis.suggestedAction);
```

### Health Monitoring

```typescript
// Check service health
const healthStatus = await llmService.getStatus();
console.log('Service healthy:', healthStatus.healthy);
console.log('Latency:', healthStatus.latency);

// Global health check
const globalHealth = await factory.getGlobalHealth();
```

## Advanced Features

### Custom Providers

```typescript
import { BaseAIService, LLMService } from './lib/ai/interfaces';

class CustomLLMService implements LLMService {
  readonly provider = 'custom';
  readonly serviceType = 'llm';
  readonly version = '1.0.0';

  async generate(request: LLMGenerationRequest): Promise<AIResponse<LLMGenerationResponse>> {
    // Custom implementation
  }

  // Implement other required methods...
}

// Register custom provider
factory.registerCustomProvider('custom', CustomLLMService);
```

### RAG Integration

```typescript
import { ChatService } from './lib/ai/interfaces';

const chatService = await factory.createService<ChatService>('chat', 'openai', chatConfig);

// Add documents to knowledge base
await chatService.addToKnowledgeBase('docs', [
  { id: '1', content: 'AI documentation...', metadata: { source: 'docs' } }
]);

// Chat with RAG
const response = await chatService.chat({
  message: 'How do I configure the AI service?',
  ragOptions: {
    enabled: true,
    maxResults: 5,
    threshold: 0.7
  }
});
```

### Streaming with Next.js

```typescript
// pages/api/chat.ts
import { ChatService } from './lib/ai';

export default async function handler(req: NextRequest) {
  const chatService = await factory.createService<ChatService>('chat', 'abacusai', config);
  
  const stream = await chatService.chatStream({
    message: req.body.message,
    sessionId: req.body.sessionId
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      for await (const chunk of stream) {
        const data = JSON.stringify({
          content: chunk.delta.content,
          finishReason: chunk.finishReason
        });
        
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
      
      controller.close();
    }
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache'
    }
  });
}
```

## Best Practices

### Configuration Management

1. **Use environment-specific configs**: Different settings for dev/staging/prod
2. **Validate configurations**: Always validate configs before use
3. **Secure API keys**: Use environment variables or secure vaults
4. **Monitor usage**: Track API usage and costs

### Error Handling

1. **Implement retry logic**: Use appropriate retry strategies
2. **Handle rate limits**: Respect provider rate limits
3. **Use circuit breakers**: Prevent cascade failures
4. **Log errors properly**: Use structured logging

### Performance

1. **Enable caching**: Cache responses when appropriate
2. **Use streaming**: For long-running requests
3. **Batch operations**: Combine multiple requests when possible
4. **Monitor latency**: Track response times

## Troubleshooting

### Common Issues

**Configuration Errors**
```typescript
// Check configuration validity
const validation = await configValidator.validateConfig(config);
if (!validation.valid) {
  console.error('Config errors:', validation.errors);
}
```

**Network Issues**
```typescript
// Test connectivity
const connectionTest = await factory.testConnection(config);
if (!connectionTest.success) {
  console.error('Connection failed:', connectionTest.error);
}
```

**Rate Limiting**
```typescript
// Handle rate limits gracefully
const retryStrategy = RetryStrategies.rateLimitOptimized;
service.setRetryStrategy(retryStrategy);
```

## API Reference

See individual documentation files:

- [Interfaces Documentation](./docs/interfaces.md)
- [Error Handling Guide](./docs/error-handling.md)
- [Configuration Guide](./docs/configuration.md)
- [Examples](./docs/examples.md)

## Contributing

1. Follow TypeScript strict mode
2. Add comprehensive error handling
3. Include unit tests
4. Update documentation
5. Follow existing patterns

## License

This abstraction layer is part of the trainable chatbot project.
