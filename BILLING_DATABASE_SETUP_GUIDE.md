# Billing Database Setup Guide

## 🎯 Quick Setup (5 minutes)

Follow these steps to set up the billing database tables in Supabase.

---

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button

---

## Step 2: Copy and Run the SQL

1. Open the file `BILLING_SYSTEM_SETUP.sql` in this repository
2. **Copy ALL the SQL code** (from line 1 to the end)
3. **Paste** it into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

---

## Step 3: Verify the Setup

After running the SQL, you should see:

✅ **3 tables created:**
- `subscription_plans`
- `user_subscriptions`
- `payments`

✅ **RLS (Row Level Security) enabled** on all tables

✅ **3 functions created:**
- `create_trial_subscription()`
- `can_user_make_calls()`
- `activate_subscription()`

✅ **Default Pro Plan inserted:**
- Name: "Pro Plan"
- Price: RM 1.00/month
- Features: Unlimited projects, custom domains, etc.

---

## Step 4: Check if It Worked

Run this query in the SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_plans', 'user_subscriptions', 'payments')
ORDER BY table_name;

-- Check Pro Plan was created
SELECT * FROM public.subscription_plans;
```

You should see:
- 3 table names listed
- 1 row showing "Pro Plan" with price 1.00

---

## Step 5: Test the Billing Page

1. Go back to your app
2. Navigate to `/billing` page
3. Click **"Subscribe Now"**
4. Check browser console (F12)

You should now see different logs (Edge Function being called) instead of the database error!

---

## What the SQL Does

### Tables Created

1. **subscription_plans** - Stores available subscription plans
2. **user_subscriptions** - Tracks each user's subscription status
3. **payments** - Records all payment transactions

### Security

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only see their own subscriptions
- ✅ Users can only see their own payments
- ✅ Anyone can view active subscription plans

### Functions

1. **create_trial_subscription()** - Automatically creates 7-day trial for new users
2. **can_user_make_calls()** - Checks if user has active subscription
3. **activate_subscription()** - Activates subscription after payment

---

## Troubleshooting

### ❌ Error: "permission denied for schema public"

**Solution:** You need owner/admin access to the database. Make sure you're logged in as the project owner.

### ❌ Error: "relation already exists"

**Solution:** The tables already exist! You can skip this step. Run the verification query to check.

### ❌ Still seeing "Could not find table" error

**Solution:** 
1. Make sure you ran the SQL in the **correct Supabase project**
2. Refresh your app and try again
3. Check the API URL in your `.env` file matches the project you ran SQL in

---

## Next Steps

After database setup is complete:

1. ✅ Database tables created
2. ⏳ **Deploy Edge Function** (see `supabase/functions/README.md`)
3. ⏳ Configure Billplz credentials
4. ⏳ Test payment flow

---

## Need Help?

If you see any errors:
1. Copy the exact error message
2. Take a screenshot of the SQL Editor
3. Share in the PR or issue

---

**Once this is done, the "Could not find table" error will be fixed!** ✅
