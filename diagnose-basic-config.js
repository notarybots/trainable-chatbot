
const fs = require('fs');
const path = require('path');

console.log('🔍 BASIC CONFIGURATION DIAGNOSIS');
console.log('================================\n');

// Check 1: Environment Files
console.log('1. ENVIRONMENT FILES CHECK');
console.log('--------------------------');

const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
envFiles.forEach(file => {
  const filepath = path.join(process.cwd(), file);
  if (fs.existsSync(filepath)) {
    console.log(`✅ ${file} exists`);
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`   Variables: ${lines.length}`);
    lines.forEach(line => {
      const [key] = line.split('=');
      if (key) {
        console.log(`   - ${key.trim()}`);
      }
    });
  } else {
    console.log(`❌ ${file} not found`);
  }
});

console.log('\n2. ENVIRONMENT VARIABLES AT RUNTIME');
console.log('------------------------------------');

// Load environment variables
require('dotenv').config();

const requiredVars = [
  'ABACUSAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}... (${value.length} chars)`);
  } else {
    console.log(`❌ ${varName}: Missing`);
  }
});

console.log('\n3. API ROUTES CHECK');
console.log('-------------------');

const apiRoutes = [
  'app/api/chat/route.ts',
  'app/api/test-auth/route.ts',
  'app/api/conversations/route.ts'
];

apiRoutes.forEach(route => {
  const filepath = path.join(process.cwd(), route);
  if (fs.existsSync(filepath)) {
    console.log(`✅ ${route} exists`);
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Check for proper exports
    const hasPost = content.includes('export async function POST');
    const hasGet = content.includes('export async function GET');
    console.log(`   - POST handler: ${hasPost ? '✅' : '❌'}`);
    console.log(`   - GET handler: ${hasGet ? '✅' : '❌'}`);
    
    // Check for environment variable usage
    const envVarsUsed = [];
    if (content.includes('ABACUSAI_API_KEY')) envVarsUsed.push('ABACUSAI_API_KEY');
    if (content.includes('NEXT_PUBLIC_SUPABASE_URL')) envVarsUsed.push('SUPABASE_URL');
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY')) envVarsUsed.push('SERVICE_ROLE_KEY');
    console.log(`   - Environment vars used: ${envVarsUsed.join(', ') || 'None'}`);
    
  } else {
    console.log(`❌ ${route} not found`);
  }
});

console.log('\n4. NEXT.JS CONFIGURATION CHECK');
console.log('-------------------------------');

const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  console.log('✅ next.config.js exists');
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  console.log('   Content preview:');
  console.log(content.substring(0, 200) + '...');
} else {
  console.log('❌ next.config.js not found');
}

console.log('\n5. PACKAGE.JSON SCRIPTS CHECK');
console.log('------------------------------');

const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  console.log('✅ package.json exists');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = pkg.scripts || {};
  console.log('   Scripts:');
  Object.entries(scripts).forEach(([name, script]) => {
    console.log(`   - ${name}: ${script}`);
  });
} else {
  console.log('❌ package.json not found');
}

console.log('\n================================');
console.log('DIAGNOSIS COMPLETE');
console.log('================================\n');
