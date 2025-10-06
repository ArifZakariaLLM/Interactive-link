# Edge Function Redirect Fix - IMPORTANT!

## Issue Found
The Edge Function was redirecting to `/billing?payment=success` instead of `/thank-you`, which completely bypassed the payment status check logic!

## Fix Applied
Changed redirect URL in Edge Function from:
```typescript
const redirectUrl = `${APP_URL}/billing?payment=success`
```

To:
```typescript
const redirectUrl = `${APP_URL}/thank-you`
```

## How to Update in Supabase Dashboard

### Option 1: Redeploy via Supabase CLI (Recommended)
If you have Supabase CLI set up:
```bash
supabase functions deploy create-billplz-payment
```

### Option 2: Manual Update in Dashboard
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in left sidebar
4. Click on **create-billplz-payment** function
5. Click **Edit Function**
6. Find line ~73 with:
   ```typescript
   const redirectUrl = `${APP_URL}/billing?payment=success`
   ```
7. Change it to:
   ```typescript
   const redirectUrl = `${APP_URL}/thank-you`
   ```
8. Click **Save** or **Deploy**

### Option 3: Copy Full Function Code
Copy the entire content from:
`supabase/functions/create-billplz-payment/index.ts`

And paste it into the Supabase Dashboard Edge Function editor.

## Why This Fixes the Issue

**Before:**
- User clicks "Subscribe Now"
- Gets Billplz payment URL
- Completes or cancels payment
- Billplz redirects to: `/billing?payment=success&billplz[id]=xxx&billplz[paid]=true/false`
- Billing page has no logic to check `billplz[paid]` parameter
- User sees billing page without any feedback

**After:**
- User clicks "Subscribe Now"
- Gets Billplz payment URL
- Completes or cancels payment
- Billplz redirects to: `/thank-you?billplz[id]=xxx&billplz[paid]=true/false`
- Thank You page checks `billplz[paid]` parameter:
  - If `true` → Shows "THANK YOU!" with green checkmark
  - If `false` → Shows "PAYMENT CANCELLED" with red X
- User gets proper feedback!

## Testing After Update

1. Click "Subscribe Now"
2. Select bank
3. **Cancel payment**
4. Should now see: **"PAYMENT CANCELLED"** with red X ❌
5. Try again and complete payment
6. Should see: **"THANK YOU!"** with green checkmark ✅

## Note
This is a **server-side change** - you MUST update the Edge Function in Supabase Dashboard for it to take effect!
