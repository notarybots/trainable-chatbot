const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runFinalFix() {
  console.log('🔧 Running FINAL_DATABASE_FIX.sql...');
  console.log('=====================================\n');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('FINAL_DATABASE_FIX.sql', 'utf8');
    
    // Split into individual statements (rough split on semicolons, excluding those in comments)
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute...\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} had an issue:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Error in statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 FINAL_DATABASE_FIX.sql execution completed!');
    
  } catch (err) {
    console.error('❌ Error reading or executing SQL file:', err.message);
    
    // Fallback: Execute key parts manually
    console.log('\n🔄 Attempting manual execution of key fixes...');
    
    try {
      // Get demo tenant ID and create tenant-user relationships
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', 'demo')
        .single();
      
      if (tenant) {
        console.log('✅ Found demo tenant:', tenant.id);
        
        // Create tenant-user relationships for known users
        const demoUserId = 'a5fd006f-7e4f-4c8f-ae59-19fb7c4bfb3e';
        const testUserId = 'ef24e4af-7e25-4b6e-8c41-75f2ff4386b0';
        
        // Try to create tenant_user relationships
        const { error: userError1 } = await supabase
          .from('tenant_users')
          .upsert({
            tenant_id: tenant.id,
            user_id: demoUserId,
            role: 'user'
          });
        
        if (!userError1) {
          console.log('✅ Created tenant-user relationship for demo user');
        } else {
          console.log('⚠️  Demo user relationship:', userError1.message);
        }
        
        const { error: userError2 } = await supabase
          .from('tenant_users')
          .upsert({
            tenant_id: tenant.id,
            user_id: testUserId,
            role: 'admin'
          });
        
        if (!userError2) {
          console.log('✅ Created tenant-user relationship for test user');
        } else {
          console.log('⚠️  Test user relationship:', userError2.message);
        }
        
      } else {
        console.log('❌ Demo tenant not found');
      }
      
    } catch (manualErr) {
      console.error('❌ Manual execution also failed:', manualErr.message);
    }
  }
}

runFinalFix().catch(console.error);
