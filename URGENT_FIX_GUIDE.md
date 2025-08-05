
# 🚨 URGENT: Chat Fix Guide - "Failed to send message" Error

## Root Cause Identified ✅
Your Vercel environment variables are using **placeholder values**, not actual credentials.

## Critical Issues Found:
1. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = "REPLACE_WITH_YOUR_ACTUAL_ANON_JWT_TOKEN" ❌
2. Wrong domain in Vercel: `trainable-chatbot-b5rf29dwrm-notarybots-projects.vercel.app` ❌

---

## 🔧 STEP-BY-STEP FIX (Do this NOW):

### Step 1: Get Your Correct Supabase Anon Key
1. Go to: https://app.supabase.com
2. Click your **trainable-chatbot** project (your Supabase project)
3. Go to **Settings** → **API** (left sidebar)
4. Find **"anon public"** section (NOT "service_role")
5. Copy the KEY that starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - It should be ~150+ characters long
   - It's a JWT token, NOT the short `sb_publishable_...` format

### Step 2: Fix Vercel Environment Variables
1. Go to: https://vercel.com/dashboard
2. Click your **trainable-chatbot-alpha** project
3. Go to **Settings** → **Environment Variables**
4. Update these EXACT variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://zddulwamthwhgxdmihny.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [PASTE YOUR JWT TOKEN HERE]
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHVsd2FtdGh3aGd4ZG1paG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQzMDYwNSwiZXhwIjoyMDcwMDA2NjA1fQ.Yw_L7uJZCB7TTsYIvkMPEYRRf3rcQbXt-IVBOnjQ2Aw
NEXT_PUBLIC_APP_DOMAIN = trainable-chatbot-alpha.vercel.app
NEXT_PUBLIC_DEFAULT_TENANT = demo
NEXTAUTH_URL = https://trainable-chatbot-alpha.vercel.app
NEXTAUTH_SECRET = kJ8mN2qR5tU7wZ9bD1gF4hL6oP3sV8xC
ABACUSAI_API_KEY = 3250288c54dc464d80791cfcafa9f430
```

### Step 3: Update Supabase Auth Settings
1. In Supabase Dashboard → **Authentication** → **Settings**
2. Update **Site URL**: `https://trainable-chatbot-alpha.vercel.app`
3. Update **Redirect URLs**:
   ```
   https://trainable-chatbot-alpha.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

### Step 4: Wait for Auto-Deployment
- Vercel will auto-deploy (2-3 minutes)
- Check: https://trainable-chatbot-alpha.vercel.app

---

## 🎯 What Should Happen:
1. ✅ Users can sign up/login
2. ✅ Chat messages send successfully  
3. ✅ AI responses are received
4. ✅ No more "Failed to send message" errors

## 🚨 If Still Failing:
1. Check Vercel deployment logs for errors
2. Verify the anon key is the JWT format (starts with `eyJ...`)
3. Ensure all environment variables are saved in Vercel

---

**PRIORITY: Fix the Supabase anon key first - that's the #1 blocker!**
