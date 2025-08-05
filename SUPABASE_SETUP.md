
# 🚀 Supabase Setup Guide for Multi-Tenant Chatbot

This guide will help you set up Supabase for your multi-tenant chatbot application.

## 📋 Prerequisites

- Supabase account (sign up at [supabase.com](https://supabase.com))
- The code is already configured and ready to connect

## 🎯 Step 1: Create Supabase Project

1. **Log in to Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Sign in with your account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Project Name: `trainable-chatbot-prod` (or your preferred name)
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
   - Pricing Plan: **Pro ($25/month)** - Required for production scaling

3. **Wait for Project Creation**
   - This takes 2-3 minutes
   - You'll get a confirmation when ready

## 🔧 Step 2: Configure Project Settings

### **Authentication Settings**
1. Go to **Authentication → Settings**
2. **Site URL**: Add your production domain
   ```
   https://trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
   ```
3. **Redirect URLs**: Add auth callback URLs
   ```
   https://trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

4. **Enable Providers** (optional)
   - Enable Google OAuth if you want social login
   - Configure OAuth credentials in respective provider settings

### **Database Configuration**
1. Go to **Settings → Database**
2. **Connection Pooling**: Enable (important for scaling)
   - Mode: Transaction
   - Pool Size: 15 (for Pro tier)

## 🗄️ Step 3: Run Database Migration

1. **Go to SQL Editor**
   - Navigate to **SQL Editor** in the dashboard
   - Click **New Query**

2. **Run the Migration Script**
   - Copy the entire content from `supabase/migrations/001_initial_schema.sql`
   - Paste it in the SQL editor
   - Click **Run** (this may take 30-60 seconds)

3. **Verify Tables Created**
   - Go to **Table Editor**
   - You should see: `tenants`, `tenant_users`, `chat_sessions`, `knowledge_base`

## 🔑 Step 4: Get Project Credentials

1. **Go to Settings → API**
2. **Copy the following values:**

   **Project URL:**
   ```
   https://[your-project-ref].supabase.co
   ```

   **API Keys:**
   - `anon/public` key (safe to use in frontend)
   - `service_role` key (keep secret, server-side only)

## 🌍 Step 5: Update Environment Variables

1. **Open your `.env.local` file**
2. **Replace the placeholder values:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Multi-tenant Configuration
NEXT_PUBLIC_APP_DOMAIN=trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXT_PUBLIC_DEFAULT_TENANT=demo

# NextAuth Configuration (if keeping for additional auth)  
NEXTAUTH_URL=https://trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-here
```

## 🔒 Step 6: Configure Row Level Security (RLS)

The migration script automatically sets up RLS policies, but verify:

1. **Go to Authentication → Policies**
2. **Verify policies exist for:**
   - `tenants` - Users can view their tenant
   - `tenant_users` - Tenant-scoped user access
   - `chat_sessions` - User's own sessions within their tenant
   - `knowledge_base` - Tenant-scoped + global knowledge access

## 🚀 Step 7: Deploy to Vercel

1. **Add Environment Variables to Vercel**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables  
   - Add all the variables from `.env.local`

2. **Deploy Latest Changes**
   - Push your updated `.env.local` to GitHub (it's gitignored, so add manually to Vercel)
   - Trigger a new deployment

## ✅ Step 8: Test the Setup

1. **Visit your deployed app**
2. **Navigate to `/login`**
3. **Try creating an account**
4. **Verify in Supabase:**
   - Check **Authentication → Users** for new user
   - Check **Table Editor → tenant_users** for tenant association

## 🎯 Expected Database Structure

After migration, you'll have:

```
├── tenants (tenant management)
│   ├── demo (default tenant)
│   └── master (global tenant)
├── tenant_users (user-tenant relationships)
├── chat_sessions (conversation history)
└── knowledge_base (hierarchical knowledge)
    ├── Global entries (tenant_id = null)
    └── Tenant-specific entries
```

## 🔍 Troubleshooting

**Common Issues:**

1. **Connection Refused**
   - Check project URL and API keys
   - Ensure project is fully created (not in setup mode)

2. **RLS Policy Errors**
   - Re-run the migration script
   - Check if policies are enabled in Authentication → Policies

3. **Authentication Issues**
   - Verify redirect URLs match exactly
   - Check if email confirmation is required

## 📊 Monitoring & Scaling

**Pro Tier Limits:**
- 500MB database size
- 5GB bandwidth
- 50,000 monthly active users
- Connection pooling enabled

**Upgrade to Team ($599/month) when you need:**
- 8GB database size  
- 250GB bandwidth
- Point-in-time recovery
- Priority support

---

## 🎉 You're Ready!

Once completed, your multi-tenant chatbot will have:
✅ Secure tenant isolation
✅ Scalable authentication
✅ Hierarchical knowledge base
✅ Real-time capabilities
✅ Production-ready RLS policies

Need help? Check the Supabase documentation or create an issue in the project repository.
