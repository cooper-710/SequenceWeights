# Vercel Environment Variables

Add these environment variables in your Vercel project settings:

## Required Environment Variables

1. **SUPABASE_URL**
   - Value: `https://hujafineklugpodypbrw.supabase.co`
   - Environment: Production, Preview, Development

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1amFmaW5la2x1Z3BvZHlwYnJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg3NTUyMywiZXhwIjoyMDgwNDUxNTIzfQ.wbSCm1w_-CMGHSMvkpHrdbdQimHe1wMaUWNySda8Ku0`
   - Environment: Production, Preview, Development
   - ⚠️ Keep this secret - server-side only

3. **VITE_SUPABASE_URL**
   - Value: `https://hujafineklugpodypbrw.supabase.co`
   - Environment: Production, Preview, Development

4. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1amFmaW5la2x1Z3BvZHlwYnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzU1MjMsImV4cCI6MjA4MDQ1MTUyM30.gua_ro8J7mkxS_ZzTeuBE05O28biORAkPeGXdzj9XVo`
   - Environment: Production, Preview, Development

## How to Add in Vercel

1. Go to your project settings in Vercel
2. Click "Environment Variables"
3. Click "Add New"
4. Add each variable above
5. Select all environments (Production, Preview, Development) for each
6. Save

## Note

After deployment, consider rotating your Supabase keys for security since they were shared in this file.
