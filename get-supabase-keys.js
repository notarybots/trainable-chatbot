
// Script to help get the correct Supabase anonymous key
const https = require('https');

async function getSupabaseConfig() {
  console.log('\n📋 SUPABASE CONFIGURATION HELPER');
  console.log('='.repeat(50));
  
  const SUPABASE_URL = 'https://zddulwamthwhgxdmihny.supabase.co';
  
  console.log('\n🔗 Current Supabase URL:', SUPABASE_URL);
  
  console.log('\n🔑 Current Environment Issues:');
  console.log('   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is using service_role key');
  console.log('   ❌ This causes authentication failures');
  console.log('   ❌ Client cannot authenticate properly');
  
  console.log('\n💡 To Fix:');
  console.log('1. Go to Supabase Dashboard: https://app.supabase.com/project/zddulwamthwhgxdmihny/settings/api');
  console.log('2. Copy the "anon public" key (NOT the service_role key)');
  console.log('3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY with the correct value');
  
  console.log('\n🔧 Keys Structure:');
  console.log('   anon key starts with: eyJ...role":"anon"...');  
  console.log('   service key starts with: eyJ...role":"service_role"...');
  
  console.log('\n⚠️  SECURITY NOTE:');
  console.log('   - anon key: Safe for client-side use');
  console.log('   - service_role key: Server-side only, full database access');
  
  console.log('\n📝 Once you get the correct anonymous key, update:');
  console.log('   - .env');
  console.log('   - .env.local');
  console.log('   - And restart the development server');
}

getSupabaseConfig();
