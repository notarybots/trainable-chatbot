# Database Migration Instructions

## Current Status
- ✅ Supabase connection: WORKING
- ✅ Tenants table: EXISTS
- ❌ Conversations table: MISSING
- ❌ Messages table: MISSING

## Required Action
The database migration must be executed manually through the Supabase Dashboard because programmatic SQL execution is restricted.

## Steps to Execute Migration

### 1. Open Supabase Dashboard
Navigate to: https://supabase.com/dashboard/project/zddulwamthwhgxdmihny/sql

### 2. Copy Migration SQL
Copy the entire contents of the file: `create_tables_manually.sql`

### 3. Execute in SQL Editor
1. Paste the SQL into the Supabase SQL Editor
2. Click "Run" to execute the migration
3. Wait for completion (should show success messages)

### 4. Verify Migration
Run the verification script:
```bash
cd /home/ubuntu/trainable-chatbot
source .env
node verify-migration.js
```

## What the Migration Creates

### Tables
- `conversations` - Stores conversation metadata
- `messages` - Stores individual messages within conversations

### Indexes
- Performance indexes for efficient queries
- Composite indexes for tenant/user filtering

### Security
- Row Level Security (RLS) policies
- Tenant isolation
- User access controls

### Sample Data
- Demo users (demo@example.com, test@example.com)
- Sample conversation with welcome messages

## Expected Result
After successful migration:
- ✅ "Failed to create new conversation" error will be resolved
- ✅ Users can create and manage conversations
- ✅ Messages are properly stored and retrieved
- ✅ Multi-tenant security is enforced

## Troubleshooting
If verification fails:
1. Check Supabase Dashboard for error messages
2. Ensure all SQL statements executed successfully
3. Verify RLS policies are created
4. Check that sample data was inserted

## Files Involved
- `create_tables_manually.sql` - Main migration script
- `verify-migration.js` - Verification script
- `supabase/migrations/` - Original migration files
