// Test the AI abstraction layer directly
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testAbstractionLayer() {
  try {
    console.log('Testing AI abstraction layer...');
    console.log('ABACUSAI_API_KEY available:', !!process.env.ABACUSAI_API_KEY);
    
    // Import the abstraction layer
    const { getDefaultLLMService } = require('./lib/ai/index');
    
    console.log('Getting default LLM service...');
    const llmService = await getDefaultLLMService();
    
    console.log('LLM Service created:', llmService.constructor.name);
    console.log('Provider:', llmService.provider);
    console.log('Service type:', llmService.serviceType);
    
    // Test chatStream method
    console.log('\nTesting chatStream...');
    const messages = [
      { role: 'user', content: 'Say hello back to me' }
    ];
    
    const streamResponse = await llmService.chatStream(messages, 'gpt-4.1-mini', {
      temperature: 0.7,
      maxTokens: 100,
    });
    
    console.log('Stream response created');
    console.log('Stream status:', streamResponse.getStatus());
    
    // Process the stream
    let buffer = '';
    console.log('Reading from stream...');
    
    for await (const chunk of streamResponse) {
      console.log('Received chunk:', JSON.stringify(chunk));
      const content = chunk.choices?.[0]?.delta?.content || '';
      if (content) {
        console.log('Chunk content:', JSON.stringify(content));
        buffer += content;
      }
    }
    
    console.log('\nFinal buffer:', JSON.stringify(buffer));
    console.log('Buffer length:', buffer.length);
    
  } catch (error) {
    console.error('Abstraction layer test error:', error);
    console.error('Error stack:', error.stack);
  }
}

testAbstractionLayer();
