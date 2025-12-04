# Migration Guide: SQLite + Express → Supabase + Vercel

This guide will help you complete the migration from SQLite/Express to Supabase/Vercel.

## Prerequisites

1. **Supabase Account**: Sign up at https://supabase.com
2. **Vercel Account**: Sign up at https://vercel.com
3. **Node.js 18+**: Ensure you have the latest LTS version

## Step 1: Set Up Supabase

### 1.1 Create a New Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: Sequence Builder (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project provisioning (2-3 minutes)

### 1.2 Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_initial_schema.sql`
3. Copy the entire contents
4. Paste into the SQL Editor and click "Run"
5. Verify tables were created by going to **Table Editor**

### 1.3 Create Storage Bucket for Videos

1. Go to **Storage** in Supabase Dashboard
2. Click "Create a new bucket"
3. Name: `videos`
4. Make it **Public** (or Private if you want authenticated access)
5. Click "Create bucket"

### 1.4 Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (SUPABASE_URL)
   - **anon/public key** (VITE_SUPABASE_ANON_KEY)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY) ⚠️ Keep this secret!

## Step 2: Migrate Existing Data (Optional)

If you have existing data in SQLite, you'll need to export and import it.

### 2.1 Export SQLite Data

Run a script to export your SQLite data to JSON/CSV, or use the Supabase migration tool.

### 2.2 Import to Supabase

1. Use Supabase Dashboard → **Table Editor** to manually import
2. Or use the Supabase CLI: `supabase db push`
3. Or create a migration script using the Supabase client

### 2.3 Migrate Exercise CSV

The CSV exercises will be migrated to the `exercises` table. You can:
- Import directly via Supabase Dashboard
- Use a migration script
- Import through the API after deployment

## Step 3: Configure Environment Variables

### 3.1 Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### 3.2 Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add these variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Step 4: Install Dependencies

```bash
# Install frontend dependencies (includes Supabase client)
npm install

# Install API dependencies
cd api
npm install
cd ..
```

## Step 5: Update Frontend Configuration

The frontend API configuration has been updated to use environment variables. The API will automatically use:
- Local development: `http://localhost:3000/api`
- Production: Your Vercel deployment URL + `/api`

## Step 6: Deploy to Vercel

### 6.1 Install Vercel CLI (if not already installed)

```bash
npm i -g vercel
```

### 6.2 Deploy

1. **Link your project**:
   ```bash
   vercel
   ```

2. **Add environment variables** (if not done via dashboard):
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

3. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### 6.3 Alternative: Deploy via GitHub

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in Vercel settings
4. Deploy automatically on push

## Step 7: Test the Deployment

1. Visit your Vercel deployment URL
2. Test key features:
   - ✅ Login/Authentication
   - ✅ Exercise library
   - ✅ Athlete management
   - ✅ Workout creation
   - ✅ Video uploads

## Step 8: Update Video Upload Configuration

The video upload endpoint now uses Supabase Storage. You may need to:

1. Update video upload logic in the frontend to use Supabase Storage client
2. Or continue using the API endpoint (which uploads to Supabase Storage)

## Architecture Changes

### Before (SQLite + Express)
- Express server on port 3001
- SQLite database file
- Local file storage for videos
- CSV file for exercises

### After (Supabase + Vercel)
- Vercel serverless functions in `/api`
- Supabase PostgreSQL database
- Supabase Storage for videos
- Database table for exercises

## API Endpoints

All endpoints remain the same:
- `/api/exercises` - Exercise CRUD
- `/api/athletes` - Athlete CRUD
- `/api/teams` - Team CRUD
- `/api/workouts` - Workout CRUD
- `/api/auth/login` - Authentication
- `/api/upload/video` - Video uploads

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check that migrations have been run
- Verify network connectivity

### CORS Issues
- CORS headers are configured in `vercel.json`
- Check that API routes are accessible

### Video Upload Issues
- Verify storage bucket exists in Supabase
- Check bucket permissions (public/private)
- Verify file size limits

### Environment Variables
- Ensure all variables are set in Vercel
- Check variable names match exactly
- Restart Vercel functions after adding variables

## Support

If you encounter issues:
1. Check Vercel function logs
2. Check Supabase logs
3. Verify all environment variables are set
4. Ensure database migrations have run successfully

## Next Steps

After migration:
1. Monitor error logs
2. Set up Supabase backups
3. Configure Row Level Security (RLS) policies if needed
4. Set up monitoring/analytics
5. Consider using Supabase Auth for better authentication
