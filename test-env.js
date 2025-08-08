#!/usr/bin/env node

// Load environment variables from .env files
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Simple test script to check environment variables and API
console.log('=== Environment Variables Test ===');
console.log('ABACUSAI_API_KEY:', process.env.ABACUSAI_API_KEY ? '[SET]' : '[NOT SET]');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[SET]' : '[NOT SET]');
console.log('NODE_ENV:', process.env.NODE_ENV);

if (process.env.ABACUSAI_API_KEY) {
  console.log('AbacusAI API Key length:', process.env.ABACUSAI_API_KEY.length);
  console.log('AbacusAI API Key first 8 chars:', process.env.ABACUSAI_API_KEY.substring(0, 8) + '...');
} else {
  console.log('AbacusAI API Key is not set');
}

// Test the AI abstraction layer
async function testAILayer() {
  console.log('\n=== Testing AI Abstraction Layer ===');
  try {
    // Import the function
    const { getDefaultLLMService } = require('./lib/ai/providers/factory/provider-factory');
    console.log('Successfully imported getDefaultLLMService');
    
    // Try to create the service
    const llmService = await getDefaultLLMService();
    console.log('Successfully created LLM service:', llmService.provider);
    
    // Test a simple completion
    console.log('\n=== Testing Simple Completion ===');
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello, I am working!" in one sentence.' }
    ];
    
    const result = await llmService.chatStream(messages, 'gpt-4.1-mini', {
      temperature: 0.7,
      maxTokens: 100
    });
    
    console.log('Chat stream initiated successfully');
    
    // Process the stream
    let response = '';
    for await (const chunk of result) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      if (content) {
        response += content;
        process.stdout.write(content);
      }
    }
    
    console.log('\nFinal response:', response);
    console.log('✅ AI layer test completed successfully!');
    
  } catch (error) {
    console.error('❌ AI layer test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAILayer();
