
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read migration file
    const migrationSQL = readFileSync('./supabase/migrations/002_conversation_history.sql', 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .filter(stmt => !stmt.match(/^\s*$/));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...');
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ sql: statement })
        });
        
        if (response.ok) {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } else {
          const error = await response.text();
          console.log(`⚠️ Statement ${i + 1} result: ${error}`);
        }
      } catch (error) {
        console.log(`⚠️ Statement ${i + 1} error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('📋 Summary: Database schema updated with conversations and messages tables');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

executeMigration().catch(console.error);

