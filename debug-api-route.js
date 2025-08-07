
// Test the API route environment variable loading
const path = require('path');

// Set the working directory to mimic Next.js environment
process.chdir('/home/ubuntu/trainable-chatbot');

// Load environment variables like Next.js does
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

console.log('🔍 Debugging API Route Environment...');
console.log('Working directory:', process.cwd());
console.log('Environment variables:');
console.log('- ABACUSAI_API_KEY:', process.env.ABACUSAI_API_KEY ? 
    process.env.ABACUSAI_API_KEY.substring(0, 10) + '...' + process.env.ABACUSAI_API_KEY.substring(process.env.ABACUSAI_API_KEY.length - 4) 
    : 'NOT SET');

// Test if the API key is available
if (!process.env.ABACUSAI_API_KEY) {
    console.error('❌ ABACUSAI_API_KEY is not set in the environment');
} else if (process.env.ABACUSAI_API_KEY.includes('your-abacus-ai-key-here')) {
    console.error('❌ ABACUSAI_API_KEY is still set to placeholder value');
} else {
    console.log('✅ ABACUSAI_API_KEY is properly set');
}

// Check if .env files exist
const fs = require('fs');

console.log('\n📁 Environment file check:');
const envFiles = ['.env', '.env.local', 'app/.env'];
for (const file of envFiles) {
    const exists = fs.existsSync(file);
    console.log(`- ${file}: ${exists ? '✅ exists' : '❌ not found'}`);
    if (exists) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const hasApiKey = content.includes('ABACUSAI_API_KEY');
            console.log(`  Contains ABACUSAI_API_KEY: ${hasApiKey ? '✅' : '❌'}`);
        } catch (error) {
            console.log(`  Error reading file: ${error.message}`);
        }
    }
}

// Test environment variable precedence
console.log('\n🔄 Testing environment variable loading order:');
delete require.cache[require.resolve('dotenv')];
const dotenv = require('dotenv');

// Load in Next.js order: .env.local, then .env
const envLocal = dotenv.config({ path: '.env.local' });
const envDefault = dotenv.config({ path: '.env' });

console.log('.env.local loaded:', !envLocal.error);
console.log('.env loaded:', !envDefault.error);
console.log('Final ABACUSAI_API_KEY value:', process.env.ABACUSAI_API_KEY ? 
    process.env.ABACUSAI_API_KEY.substring(0, 10) + '...' + process.env.ABACUSAI_API_KEY.substring(process.env.ABACUSAI_API_KEY.length - 4)
    : 'NOT SET');
