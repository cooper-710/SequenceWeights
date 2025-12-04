# Deployment Checklist

Use this checklist to ensure everything is set up correctly for deployment to Vercel + Supabase.

## Pre-Deployment Setup

### Supabase Setup
- [ ] Create Supabase project at https://app.supabase.com
- [ ] Run database migration from `supabase/migrations/001_initial_schema.sql`
- [ ] Create storage bucket named `videos` in Supabase Storage
- [ ] Copy Supabase credentials:
  - [ ] Project URL
  - [ ] Anon/Public Key
  - [ ] Service Role Key (keep secret!)

### Local Development
- [ ] Install dependencies: `npm install`
- [ ] Install API dependencies: `cd api && npm install && cd ..`
- [ ] Copy `env.template` to `.env.local` and fill in values
- [ ] Test locally (if running local server): `npm run dev`

### Code Review
- [ ] Verify all API endpoints are created in `/api` directory
- [ ] Check that database schema matches your needs
- [ ] Review environment variable usage
- [ ] Ensure no hardcoded secrets in code

## Vercel Deployment

### Initial Setup
- [ ] Install Vercel CLI: `npm i -g vercel` (optional)
- [ ] Login to Vercel: `vercel login`
- [ ] Link project: `vercel` (or connect via GitHub)

### Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- [ ] `VITE_SUPABASE_URL` - Same as SUPABASE_URL (for client)
- [ ] `VITE_SUPABASE_ANON_KEY` - Anon/public key (for client)

### Deploy
- [ ] Push code to GitHub (if using GitHub integration)
- [ ] Or deploy via CLI: `vercel --prod`
- [ ] Wait for deployment to complete
- [ ] Note your deployment URL

### Post-Deployment
- [ ] Visit your Vercel deployment URL
- [ ] Test authentication/login
- [ ] Test exercise library (create, read, update, delete)
- [ ] Test athlete management
- [ ] Test team management
- [ ] Test workout creation and editing
- [ ] Test video uploads
- [ ] Test workout completion tracking

## Data Migration (If Applicable)

If you have existing data in SQLite:
- [ ] Export data from SQLite database
- [ ] Create import script or use Supabase Dashboard
- [ ] Import athletes
- [ ] Import teams
- [ ] Import workouts
- [ ] Import exercises (or migrate from CSV)
- [ ] Upload video files to Supabase Storage
- [ ] Verify all data imported correctly

## Security Checklist

- [ ] Service role key is only in server-side environment variables
- [ ] Anon key is used for client-side (safe to expose)
- [ ] No hardcoded credentials in code
- [ ] CORS is properly configured
- [ ] Storage bucket permissions are set correctly
- [ ] Row Level Security (RLS) policies considered (if needed)

## Monitoring

- [ ] Set up error tracking (optional)
- [ ] Monitor Vercel function logs
- [ ] Monitor Supabase logs
- [ ] Set up backups in Supabase (automatic)
- [ ] Configure alerts if needed

## Troubleshooting

If something doesn't work:
1. Check Vercel function logs
2. Check Supabase logs
3. Verify environment variables are set correctly
4. Ensure database migrations have run
5. Check browser console for errors
6. Verify API endpoints are accessible

## Next Steps

After successful deployment:
- [ ] Update DNS (if using custom domain)
- [ ] Set up custom domain in Vercel
- [ ] Configure SSL (automatic with Vercel)
- [ ] Set up monitoring/analytics
- [ ] Create user documentation
- [ ] Plan for scaling if needed
