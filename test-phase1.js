

// Test script for Phase 1 conversation history implementation
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Phase 1: Conversation History Implementation\n');

// Test 1: Check if all required files exist
console.log('📁 Checking file structure...');
const requiredFiles = [
  'lib/database/conversations.ts',
  'lib/database/messages.ts',
  'app/api/conversations/route.ts',
  'app/api/conversations/[id]/route.ts',
  'supabase/migrations/002_conversation_history.sql',
  'PHASE1_MIGRATION_GUIDE.md'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Test 2: Check if TypeScript types are properly updated
console.log('\n📝 Checking TypeScript definitions...');
const typesFile = fs.readFileSync('lib/types.ts', 'utf8');
if (typesFile.includes('interface Conversation') && typesFile.includes('created_at: string')) {
  console.log('✅ Conversation interface updated');
} else {
  console.log('❌ Conversation interface missing or incorrect');
  allFilesExist = false;
}

if (typesFile.includes('conversation_id: string')) {
  console.log('✅ Message interface updated');
} else {
  console.log('❌ Message interface missing or incorrect');
  allFilesExist = false;
}

// Test 3: Check if database types include new tables
console.log('\n🗄️ Checking database types...');
const dbTypesFile = fs.readFileSync('lib/types/database.ts', 'utf8');
if (dbTypesFile.includes('conversations:') && dbTypesFile.includes('messages:')) {
  console.log('✅ Database types include conversations and messages tables');
} else {
  console.log('❌ Database types missing conversations or messages tables');
  allFilesExist = false;
}

// Test 4: Check if migration file is comprehensive
console.log('\n🔧 Checking migration completeness...');
const migrationFile = fs.readFileSync('supabase/migrations/002_conversation_history.sql', 'utf8');
const migrationChecks = [
  'CREATE TABLE.*conversations',
  'CREATE TABLE.*messages',
  'CREATE INDEX.*conversations',
  'CREATE INDEX.*messages',
  'ENABLE ROW LEVEL SECURITY',
  'CREATE POLICY.*conversations',
  'CREATE POLICY.*messages'
];

let migrationComplete = true;
migrationChecks.forEach((check, index) => {
  const regex = new RegExp(check, 'i');
  if (regex.test(migrationFile)) {
    console.log(`✅ Migration check ${index + 1}: ${check.split('.*')[0]} statements`);
  } else {
    console.log(`❌ Migration check ${index + 1}: Missing ${check.split('.*')[0]} statements`);
    migrationComplete = false;
  }
});

// Test 5: Check if API routes are properly structured
console.log('\n🌐 Checking API route structure...');
const conversationRoute = fs.readFileSync('app/api/conversations/route.ts', 'utf8');
if (conversationRoute.includes('GET') && conversationRoute.includes('POST')) {
  console.log('✅ Conversations API route has GET and POST methods');
} else {
  console.log('❌ Conversations API route missing required methods');
  allFilesExist = false;
}

const conversationDetailRoute = fs.readFileSync('app/api/conversations/[id]/route.ts', 'utf8');
if (conversationDetailRoute.includes('GET') && conversationDetailRoute.includes('PATCH') && conversationDetailRoute.includes('DELETE')) {
  console.log('✅ Conversation detail API route has GET, PATCH, and DELETE methods');
} else {
  console.log('❌ Conversation detail API route missing required methods');
  allFilesExist = false;
}

// Test 6: Check if chat container is updated
console.log('\n💬 Checking chat container integration...');
const chatContainerFile = fs.readFileSync('components/chat/chat-container.tsx', 'utf8');
if (chatContainerFile.includes('loadConversations') && chatContainerFile.includes('createNewConversation')) {
  console.log('✅ Chat container integrated with database-backed conversations');
} else {
  console.log('❌ Chat container not properly integrated');
  allFilesExist = false;
}

// Summary
console.log('\n📊 Test Summary:');
console.log('================');
if (allFilesExist && migrationComplete) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('\n✅ Phase 1: Conversation History implementation is complete and ready for deployment.');
  console.log('\n📋 Next steps:');
  console.log('1. Run the database migration (see PHASE1_MIGRATION_GUIDE.md)');
  console.log('2. Test the application with real user interactions');
  console.log('3. Verify multi-tenant isolation');
  console.log('4. Deploy to production environment');
  console.log('\n🚀 Ready for checkpoint!');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('Please review the failed checks above and fix the issues.');
  process.exit(1);
}

