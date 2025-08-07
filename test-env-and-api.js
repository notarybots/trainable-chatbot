
const fs = require('fs');
const path = require('path');

// Manually load .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^"(.*)"$/, '$1');
          process.env[key] = value;
        }
      }
    });
    
    console.log('✅ Environment file loaded');
  } else {
    console.log('❌ .env file not found');
  }
}

// Load environment
loadEnvFile();

console.log('🔍 Environment Check:');
console.log('- ABACUSAI_API_KEY:', process.env.ABACUSAI_API_KEY ? process.env.ABACUSAI_API_KEY.substring(0,8) + '...' : 'NOT SET');

// Test Abacus AI API with loaded environment
async function testAPI() {
  const API_KEY = process.env.ABACUSAI_API_KEY;
  
  if (!API_KEY || API_KEY === 'your-abacus-ai-key-here') {
    console.log('❌ Invalid or missing API key');
    return false;
  }
  
  console.log('🧪 Testing API with environment key...');
  
  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'The AI integration is now working! Please confirm by saying "AI integration successful".' }
        ],
        stream: false,
        max_tokens: 50,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      console.log('✅ AI Response:', data.choices[0].message.content);
      console.log('🎉 AI integration is working correctly!');
      return true;
    } else {
      console.error('❌ Unexpected response format:', data);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

// Run the test
testAPI().then(success => {
  if (success) {
    console.log('\n🎉 SUMMARY: Environment and AI integration are working!');
    console.log('📋 Next steps:');
    console.log('  1. Start the Next.js dev server: yarn dev');
    console.log('  2. Open http://localhost:3000 in your browser');
    console.log('  3. Login with: john@doe.com / johndoe123');
    console.log('  4. Try chatting - you should now get real AI responses!');
  } else {
    console.log('\n💥 SUMMARY: Environment or API issues detected');
  }
}).catch(console.error);
