
# Trainable Chatbot

This is a multi-tenant chatbot built with [Next.js](https://nextjs.org/) and Supabase.

## Features
- Multi-tenant architecture with secure tenant isolation
- Supabase authentication and database
- Hierarchical knowledge base (global + tenant-specific)
- Chat session management
- Role-based permissions

## Setup Status
- ✅ Database migration completed
- ✅ Supabase credentials configured  
- ✅ Environment variables set in Vercel
- ✅ Authentication settings configured

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Deployment:** Vercel
- **Multi-tenancy:** Row Level Security (RLS)

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
