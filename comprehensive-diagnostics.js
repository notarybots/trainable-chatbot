
/**
 * COMPREHENSIVE CONVERSATION DIAGNOSTICS
 * 
 * This script systematically tests every component of the conversation system
 * to identify the exact root cause of "Failed to create new conversation" errors
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName) {
  log(`\n🧪 Testing: ${testName}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Global state for diagnostics
const diagnostics = {
  environment: {},
  database: {},
  authentication: {},
  api: {},
  tables: {},
  policies: {},
  users: {},
  errors: []
};

// Initialize Supabase clients
let supabaseAnon = null;
let supabaseService = null;

async function initializeSupabaseClients() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing Supabase URL or Anon Key');
    }

    supabaseAnon = createClient(url, anonKey);
    if (serviceKey) {
      supabaseService = createClient(url, serviceKey);
    }

    logSuccess('Supabase clients initialized');
    return true;
  } catch (error) {
    logError(`Failed to initialize Supabase clients: ${error.message}`);
    diagnostics.errors.push(`Supabase initialization: ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  logSection('PHASE 1: ENVIRONMENT VARIABLES');

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_DEFAULT_TENANT'
  ];

  const optionalVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ];

  let allPresent = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      logSuccess(`${varName}: ${value.substring(0, 20)}...`);
      diagnostics.environment[varName] = 'present';
    } else {
      logError(`${varName}: MISSING`);
      diagnostics.environment[varName] = 'missing';
      allPresent = false;
    }
  });

  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      logInfo(`${varName}: ${value.substring(0, 20)}...`);
      diagnostics.environment[varName] = 'present';
    } else {
      logWarning(`${varName}: Not set (optional)`);
      diagnostics.environment[varName] = 'not_set';
    }
  });

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z]+\.supabase\.co$/)) {
    logWarning(`Supabase URL format looks unusual: ${supabaseUrl}`);
  }

  diagnostics.environment.status = allPresent ? 'valid' : 'invalid';
  return allPresent;
}

async function testDatabaseConnection() {
  logSection('PHASE 2: DATABASE CONNECTION');

  if (!supabaseAnon || !supabaseService) {
    logError('Supabase clients not initialized');
    return false;
  }

  // Test anon client connection
  logTest('Anonymous client connection');
  try {
    const { data, error } = await supabaseAnon.from('tenants').select('count').limit(1);
    if (error) {
      logError(`Anon client connection failed: ${error.message}`);
      diagnostics.database.anonConnection = 'failed';
    } else {
      logSuccess('Anonymous client connected successfully');
      diagnostics.database.anonConnection = 'success';
    }
  } catch (error) {
    logError(`Anon client connection error: ${error.message}`);
    diagnostics.database.anonConnection = 'error';
  }

  // Test service client connection
  logTest('Service client connection');
  try {
    const { data, error } = await supabaseService.from('tenants').select('count').limit(1);
    if (error) {
      logError(`Service client connection failed: ${error.message}`);
      diagnostics.database.serviceConnection = 'failed';
    } else {
      logSuccess('Service client connected successfully');
      diagnostics.database.serviceConnection = 'success';
    }
  } catch (error) {
    logError(`Service client connection error: ${error.message}`);
    diagnostics.database.serviceConnection = 'error';
  }

  return diagnostics.database.anonConnection === 'success' && 
         diagnostics.database.serviceConnection === 'success';
}

async function testTableExistence() {
  logSection('PHASE 3: TABLE EXISTENCE');

  const requiredTables = ['tenants', 'tenant_users', 'conversations', 'messages'];
  let allTablesExist = true;

  for (const tableName of requiredTables) {
    logTest(`Checking table: ${tableName}`);
    
    try {
      const { data, error } = await supabaseService.from(tableName).select('count').limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          logError(`Table "${tableName}" does not exist`);
          diagnostics.tables[tableName] = 'missing';
          allTablesExist = false;
        } else {
          logError(`Error checking table "${tableName}": ${error.message}`);
          diagnostics.tables[tableName] = 'error';
          allTablesExist = false;
        }
      } else {
        logSuccess(`Table "${tableName}" exists`);
        diagnostics.tables[tableName] = 'exists';
      }
    } catch (error) {
      logError(`Exception checking table "${tableName}": ${error.message}`);
      diagnostics.tables[tableName] = 'exception';
      allTablesExist = false;
    }
  }

  // Test table structure for key tables
  if (diagnostics.tables.conversations === 'exists') {
    logTest('Conversations table structure');
    try {
      const { data, error } = await supabaseService.from('conversations').select('*').limit(1);
      if (!error && data !== null) {
        logSuccess('Conversations table structure is valid');
        diagnostics.tables.conversationsStructure = 'valid';
      } else {
        logWarning(`Conversations table structure issue: ${error?.message}`);
        diagnostics.tables.conversationsStructure = 'invalid';
      }
    } catch (error) {
      logError(`Error checking conversations structure: ${error.message}`);
      diagnostics.tables.conversationsStructure = 'error';
    }
  }

  if (diagnostics.tables.messages === 'exists') {
    logTest('Messages table structure');
    try {
      const { data, error } = await supabaseService.from('messages').select('*').limit(1);
      if (!error && data !== null) {
        logSuccess('Messages table structure is valid');
        diagnostics.tables.messagesStructure = 'valid';
      } else {
        logWarning(`Messages table structure issue: ${error?.message}`);
        diagnostics.tables.messagesStructure = 'invalid';
      }
    } catch (error) {
      logError(`Error checking messages structure: ${error.message}`);
      diagnostics.tables.messagesStructure = 'error';
    }
  }

  return allTablesExist;
}

async function testUsersAndTenants() {
  logSection('PHASE 4: USERS AND TENANTS');

  // Check if demo tenant exists
  logTest('Demo tenant existence');
  try {
    const { data: tenants, error } = await supabaseService
      .from('tenants')
      .select('*')
      .eq('subdomain', 'demo');

    if (error) {
      logError(`Error fetching demo tenant: ${error.message}`);
      diagnostics.users.demoTenant = 'error';
    } else if (!tenants || tenants.length === 0) {
      logError('Demo tenant does not exist');
      diagnostics.users.demoTenant = 'missing';
    } else {
      logSuccess(`Demo tenant exists: ${tenants[0].name} (${tenants[0].id})`);
      diagnostics.users.demoTenant = tenants[0];
    }
  } catch (error) {
    logError(`Exception checking demo tenant: ${error.message}`);
    diagnostics.users.demoTenant = 'exception';
  }

  // Check if test users exist
  logTest('Test users existence');
  const testEmails = ['demo@example.com', 'test@example.com'];
  
  for (const email of testEmails) {
    try {
      const { data: users, error } = await supabaseService.auth.admin.listUsers();
      
      if (error) {
        logError(`Error fetching users: ${error.message}`);
        diagnostics.users[email] = 'error';
      } else {
        const user = users.users.find(u => u.email === email);
        if (user) {
          logSuccess(`User ${email} exists (${user.id})`);
          diagnostics.users[email] = { id: user.id, exists: true };
        } else {
          logWarning(`User ${email} does not exist`);
          diagnostics.users[email] = { exists: false };
        }
      }
    } catch (error) {
      logError(`Exception checking user ${email}: ${error.message}`);
      diagnostics.users[email] = 'exception';
    }
  }

  // Check tenant_users relationships
  if (diagnostics.users.demoTenant !== 'missing' && diagnostics.users.demoTenant !== 'error') {
    logTest('Tenant-user relationships');
    try {
      const { data: tenantUsers, error } = await supabaseService
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', diagnostics.users.demoTenant.id);

      if (error) {
        logError(`Error fetching tenant-user relationships: ${error.message}`);
        diagnostics.users.tenantUsers = 'error';
      } else {
        logSuccess(`Found ${tenantUsers.length} tenant-user relationships`);
        diagnostics.users.tenantUsers = tenantUsers;
      }
    } catch (error) {
      logError(`Exception checking tenant-user relationships: ${error.message}`);
      diagnostics.users.tenantUsers = 'exception';
    }
  }
}

async function testRowLevelSecurity() {
  logSection('PHASE 5: ROW LEVEL SECURITY POLICIES');

  const tables = ['conversations', 'messages'];
  
  for (const table of tables) {
    if (diagnostics.tables[table] !== 'exists') {
      logWarning(`Skipping RLS test for ${table} - table doesn't exist`);
      continue;
    }

    logTest(`RLS policies for ${table}`);
    
    // Test RLS is enabled
    try {
      const { data, error } = await supabaseService.rpc('pg_tables_info', { table_name: table });
      
      // Test if we can query with anon user (should fail if RLS is working)
      const { data: anonData, error: anonError } = await supabaseAnon.from(table).select('count').limit(1);
      
      if (anonError && (anonError.code === 'PGRST301' || anonError.message.includes('policy'))) {
        logSuccess(`RLS is enabled and blocking unauthorized access for ${table}`);
        diagnostics.policies[table] = 'enabled_and_working';
      } else if (!anonError) {
        logWarning(`RLS might not be properly configured for ${table} - anon access allowed`);
        diagnostics.policies[table] = 'enabled_but_permissive';
      } else {
        logError(`Unexpected error testing RLS for ${table}: ${anonError.message}`);
        diagnostics.policies[table] = 'error';
      }
    } catch (error) {
      logError(`Exception testing RLS for ${table}: ${error.message}`);
      diagnostics.policies[table] = 'exception';
    }
  }
}

async function testDatabaseOperations() {
  logSection('PHASE 6: DATABASE OPERATIONS');

  if (diagnostics.users.demoTenant === 'missing' || diagnostics.users.demoTenant === 'error') {
    logWarning('Cannot test database operations - demo tenant not available');
    return false;
  }

  const tenantId = diagnostics.users.demoTenant.id;
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Demo user ID

  // Test conversation creation with service role
  logTest('Creating test conversation with service role');
  try {
    const { data, error } = await supabaseService.from('conversations').insert({
      tenant_id: tenantId,
      user_id: testUserId,
      title: 'Diagnostic Test Conversation',
      metadata: { test: true, created_by: 'diagnostics' }
    }).select().single();

    if (error) {
      logError(`Failed to create conversation: ${error.message}`);
      diagnostics.database.conversationCreate = 'failed';
      diagnostics.errors.push(`Conversation creation: ${error.message}`);
    } else {
      logSuccess(`Test conversation created successfully: ${data.id}`);
      diagnostics.database.conversationCreate = 'success';
      diagnostics.database.testConversationId = data.id;

      // Test message creation
      logTest('Creating test message');
      try {
        const { data: messageData, error: messageError } = await supabaseService.from('messages').insert({
          conversation_id: data.id,
          role: 'user',
          content: 'This is a diagnostic test message',
          metadata: { test: true }
        }).select().single();

        if (messageError) {
          logError(`Failed to create message: ${messageError.message}`);
          diagnostics.database.messageCreate = 'failed';
        } else {
          logSuccess(`Test message created successfully: ${messageData.id}`);
          diagnostics.database.messageCreate = 'success';
        }
      } catch (messageError) {
        logError(`Exception creating message: ${messageError.message}`);
        diagnostics.database.messageCreate = 'exception';
      }
    }
  } catch (error) {
    logError(`Exception creating conversation: ${error.message}`);
    diagnostics.database.conversationCreate = 'exception';
    diagnostics.errors.push(`Conversation creation exception: ${error.message}`);
  }

  return diagnostics.database.conversationCreate === 'success';
}

async function testAPIEndpoints() {
  logSection('PHASE 7: API ENDPOINTS (Simulation)');

  // We can't directly test the API endpoints since they require Next.js runtime
  // But we can simulate the logic flow

  logTest('Simulating API authentication flow');
  
  if (diagnostics.users.demoTenant && diagnostics.users['demo@example.com']) {
    const tenantId = diagnostics.users.demoTenant.id;
    const userId = diagnostics.users['demo@example.com'].id;

    // Simulate getting tenant_id from user
    logTest('Simulating tenant lookup for user');
    try {
      const { data, error } = await supabaseService
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        logError(`Tenant lookup failed: ${error.message}`);
        diagnostics.api.tenantLookup = 'failed';
      } else {
        logSuccess(`Tenant lookup successful: ${data.tenant_id}`);
        diagnostics.api.tenantLookup = 'success';
        diagnostics.api.tenantId = data.tenant_id;
      }
    } catch (error) {
      logError(`Exception in tenant lookup: ${error.message}`);
      diagnostics.api.tenantLookup = 'exception';
    }
  } else {
    logWarning('Cannot simulate API flow - user or tenant not available');
    diagnostics.api.tenantLookup = 'skipped';
  }
}

async function cleanupTestData() {
  logSection('CLEANUP: Removing Test Data');

  if (diagnostics.database.testConversationId) {
    logTest('Removing test conversation');
    try {
      const { error } = await supabaseService
        .from('conversations')
        .delete()
        .eq('id', diagnostics.database.testConversationId);

      if (error) {
        logWarning(`Failed to cleanup test conversation: ${error.message}`);
      } else {
        logSuccess('Test conversation removed successfully');
      }
    } catch (error) {
      logWarning(`Exception during cleanup: ${error.message}`);
    }
  }
}

function generateDiagnosticReport() {
  logSection('DIAGNOSTIC REPORT');

  let issuesFound = 0;
  let criticalIssues = [];

  // Check environment
  if (diagnostics.environment.status !== 'valid') {
    issuesFound++;
    criticalIssues.push('Environment variables are missing or invalid');
  }

  // Check database connection
  if (diagnostics.database.anonConnection !== 'success' || diagnostics.database.serviceConnection !== 'success') {
    issuesFound++;
    criticalIssues.push('Database connection issues');
  }

  // Check required tables
  const requiredTables = ['tenants', 'tenant_users', 'conversations', 'messages'];
  const missingTables = requiredTables.filter(table => diagnostics.tables[table] !== 'exists');
  if (missingTables.length > 0) {
    issuesFound++;
    criticalIssues.push(`Missing database tables: ${missingTables.join(', ')}`);
  }

  // Check users and tenants
  if (diagnostics.users.demoTenant === 'missing') {
    issuesFound++;
    criticalIssues.push('Demo tenant is missing');
  }

  if (diagnostics.users['demo@example.com'] && !diagnostics.users['demo@example.com'].exists) {
    issuesFound++;
    criticalIssues.push('Demo user is missing');
  }

  // Check database operations
  if (diagnostics.database.conversationCreate !== 'success') {
    issuesFound++;
    criticalIssues.push('Cannot create conversations in database');
  }

  console.log('\n' + '█'.repeat(80));
  log('DIAGNOSTIC SUMMARY', 'cyan');
  console.log('█'.repeat(80));

  if (issuesFound === 0) {
    logSuccess('✨ NO CRITICAL ISSUES FOUND! The system should be working.');
  } else {
    logError(`🚨 FOUND ${issuesFound} CRITICAL ISSUE(S):`);
    criticalIssues.forEach((issue, index) => {
      logError(`   ${index + 1}. ${issue}`);
    });
  }

  console.log('\n' + '▼'.repeat(80));
  log('RECOMMENDED ACTIONS', 'yellow');
  console.log('▼'.repeat(80));

  if (missingTables.length > 0) {
    logWarning('🔧 ACTION REQUIRED: Run the database migration script');
    logInfo('   Execute the SQL script: create_tables_manually.sql in your Supabase dashboard');
  }

  if (diagnostics.users.demoTenant === 'missing') {
    logWarning('🔧 ACTION REQUIRED: Create demo tenant');
    logInfo('   The migration script should create this automatically');
  }

  if (diagnostics.users['demo@example.com'] && !diagnostics.users['demo@example.com'].exists) {
    logWarning('🔧 ACTION REQUIRED: Create test users');
    logInfo('   The migration script should create these automatically');
  }

  if (diagnostics.errors.length > 0) {
    console.log('\n' + '⚠️'.repeat(80));
    log('DETAILED ERRORS', 'red');
    console.log('⚠️'.repeat(80));
    diagnostics.errors.forEach((error, index) => {
      logError(`${index + 1}. ${error}`);
    });
  }

  console.log('\n' + '📋'.repeat(80));
  log('DETAILED DIAGNOSTICS DATA', 'blue');
  console.log('📋'.repeat(80));
  console.log(JSON.stringify(diagnostics, null, 2));
}

async function runFullDiagnostics() {
  console.log('🔍 TRAINABLE CHATBOT - COMPREHENSIVE DIAGNOSTICS');
  console.log('📅 Started at:', new Date().toISOString());
  console.log('💻 Node.js version:', process.version);

  try {
    // Initialize
    if (!await initializeSupabaseClients()) {
      logError('Cannot proceed - Supabase initialization failed');
      return;
    }

    // Run all diagnostic phases
    await testEnvironmentVariables();
    await testDatabaseConnection();
    await testTableExistence();
    await testUsersAndTenants();
    await testRowLevelSecurity();
    await testDatabaseOperations();
    await testAPIEndpoints();
    
    // Cleanup
    await cleanupTestData();
    
    // Generate report
    generateDiagnosticReport();

  } catch (error) {
    logError(`Fatal error during diagnostics: ${error.message}`);
    console.error(error);
  }
}

// Run diagnostics
runFullDiagnostics();
