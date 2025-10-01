# Quick Start Guide

Get CepatBina up and running in 10 minutes!

## 🚀 Prerequisites

Before you begin, ensure you have:
- Node.js v20.12.1 or higher installed
- npm 10.5.0 or higher
- A [Supabase](https://supabase.com) account (free tier works!)
- A [Vercel](https://vercel.com) account (free tier works!)
- Git installed on your machine

## Step 1: Clone the Repository

```bash
git clone https://github.com/ArifZakariaLLM/Interactive-link.git
cd Interactive-link
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (~430 packages).

## Step 3: Set Up Supabase

### Create a New Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in your project details
4. Wait for the project to be provisioned (2-3 minutes)

### Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `COMPLETE_DATABASE_SETUP.sql`
3. Click **Run** to execute the SQL
4. Verify tables are created:
   - `projects`
   - `custom_domains`

### Get Your Credentials

1. Go to **Settings** → **API**
2. Copy:
   - `Project URL` (looks like: `https://xxxxx.supabase.co`)
   - `anon/public` key (starts with `eyJ...`)

## Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Run the Development Server

```bash
npm run dev
```

Your app should now be running at `http://localhost:5173`! 🎉

## Step 6: Create Your First Project

1. Open `http://localhost:5173` in your browser
2. Click **Sign Up** to create an account
3. Log in with your credentials
4. Navigate to **Dashboard**
5. Click **Create New Project**
6. Add some HTML/CSS/JS code
7. Click **Save**

Your first project is live!

## Step 7: Test the Community Feature

1. In your project, toggle **Community Visible** to ON
2. Navigate to **Community** page
3. You should see your project listed!
4. Try previewing and visiting your project

## Step 8: Deploy to Vercel (Optional)

### Deploy Main Application

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add environment variables from your `.env`
7. Click **Deploy**

Your main app will be live at: `https://your-app.vercel.app`

### Deploy Live Sites Server (For Custom Domains)

1. Create a **new** Vercel project
2. Import the **same** GitHub repository
3. Configure:
   - **Framework Preset**: Other
   - **Build Command**: `cp vercel-live.json vercel.json`
   - **Output Directory**: `.`
4. Add same environment variables
5. Click **Deploy**

## Step 9: Set Up Custom Domains (Advanced)

### Get Vercel API Token

1. Go to Vercel **Settings** → **Tokens**
2. Create a new token
3. Copy the token

### Configure Vercel API

Edit `src/utils/vercelApi.ts`:

```typescript
const VERCEL_API_TOKEN = 'your-vercel-token-here';
const LIVE_SITES_PROJECT_ID = 'your-live-sites-project-id';
```

Get your Live Sites Project ID from Vercel project settings.

### Add Your First Custom Domain

1. In Dashboard, open a project
2. Click **Add Domain**
3. Enter your domain (e.g., `example.com`)
4. Follow the DNS configuration instructions
5. Wait for DNS propagation (up to 48 hours)
6. Click **Verify Domain**

## 🎯 What's Next?

Now that you're up and running:

- **Customize the UI**: Check out `src/components/`
- **Add Features**: Explore `src/pages/`
- **Read the Docs**: See [README.md](./README.md) for detailed info
- **Contribute**: Check [CONTRIBUTING.md](./CONTRIBUTING.md)

## Common Issues

### Port 5173 is already in use
```bash
# Kill the process using port 5173
npx kill-port 5173

# Or run on a different port
npm run dev -- --port 3000
```

### Supabase connection error
- Double-check your `.env` file
- Ensure URL has `https://` prefix
- Verify anon key is correct
- Check if Supabase project is active

### Build fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### ESLint errors
```bash
# Auto-fix linting issues
npm run lint
```

## 📚 Resources

- **Documentation**: [README.md](./README.md)
- **Contributing Guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev

## 💬 Need Help?

- Open an issue on [GitHub](https://github.com/ArifZakariaLLM/Interactive-link/issues)
- Check existing [documentation](./README.md)
- Review [troubleshooting section](./README.md#troubleshooting)

Happy Building! 🚀
