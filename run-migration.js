

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const https = require('https');

async function runMigration() {
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('./supabase/migrations/002_conversation_history.sql', 'utf8');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const url = new URL('/rest/v1/rpc/exec_sql', supabaseUrl);
    
    const postData = JSON.stringify({
      sql: migrationSQL
    });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('Migration response status:', res.statusCode);
          console.log('Migration response:', data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Migration completed successfully');
            resolve(data);
          } else {
            console.error('❌ Migration failed');
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Migration request error:', error);
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Alternative approach using SQL execution via REST API
async function executeMigrationViaSQL() {
  try {
    const migrationSQL = fs.readFileSync('./supabase/migrations/002_conversation_history.sql', 'utf8');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🚀 Starting migration execution...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Migration SQL length:', migrationSQL.length);
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + '...');
      
      const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({ sql: statement })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to execute statement ${i + 1}:`, errorText);
        // Continue with other statements, as some might be expected to fail (like IF NOT EXISTS)
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('\n🎉 Migration process completed!');
    
  } catch (error) {
    console.error('Migration execution error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  executeMigrationViaSQL().catch(console.error);
}

