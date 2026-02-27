# AnnaVault v2 — Supabase Edition

## Setup Guide

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `annavault`, choose a region close to you, set a database password
3. Wait ~2 minutes for it to provision

### Step 2: Run the Database Schema
1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Copy the entire contents of `supabase/schema.sql`
3. Paste and click **Run**
4. You should see: "Success. No rows returned"

### Step 3: Create the Storage Bucket
1. In Supabase Dashboard → **Storage** → **New Bucket**
2. Name: `documents`
3. Public: **OFF** (keep private)
4. Click **Save**
5. Go to **Policies** tab → **New Policy** → choose "Allow all" for now

### Step 4: Get Your API Credentials
1. Supabase Dashboard → **Project Settings** → **API**
2. Copy: **Project URL** and **anon/public key**

### Step 5: Configure the App
```bash
# In your project folder:
cp .env.example .env
```
Edit `.env` and fill in your credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 6: Install & Run
```bash
npm install
npm run dev
```
Open http://localhost:5173 ✅

---

## Deploying to Vercel

### Add Environment Variables in Vercel
1. Vercel Dashboard → your project → **Settings → Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
3. Click **Save** → **Redeploy**

> ⚠️ Never commit your `.env` file — it's in `.gitignore`

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `properties` | Real estate properties |
| `leases` | Tenant leases per property |
| `documents` | File metadata (PDFs stored in Supabase Storage) |
| `assets` | Future: stocks, crypto, cash accounts |

## Features
- ✅ Supabase Realtime — changes sync instantly across tabs/devices
- ✅ Lease tracking with status (active, expiring, expired, upcoming)
- ✅ Document upload — PDF, DOC, JPG up to 50MB per file
- ✅ Sensitive field masking (mortgage login, HOA username)
- ✅ Auto-calculated equity and portfolio totals
- ✅ Tabbed property cards (Details / Leases / Documents)
