# Edge Function Update - Redirect to Thank You Page

## What to Change

In your Supabase Dashboard Edge Function `create-billplz-payment`, change the redirect URL from:

```typescript
redirect_url: `${APP_URL}/billing?payment=success`,
```

To:

```typescript
redirect_url: `${APP_URL}/thank-you`,
```

## Where to Make the Change

1. Go to: https://supabase.com/dashboard/project/mvmwcgnlebbesarvsvxk/functions
2. Click on `create-billplz-payment`
3. Find line with `redirect_url: `
4. Change it to redirect to `/thank-you` instead of `/billing?payment=success`
5. Click "Deploy" or "Save"

## Full Updated Line (around line 95)

```typescript
const billplzData = new URLSearchParams({
  collection_id: BILLPLZ_COLLECTION_ID,
  email: customer_email,
  name: customer_name,
  amount: amountInCents.toString(),
  description: `Subscription - ${plan_id}`,
  callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-billplz-payment`,
  redirect_url: `${APP_URL}/thank-you`,  // ← CHANGE THIS LINE
  reference_1_label: 'user_id',
  reference_1: user_id,
  reference_2_label: 'plan_id',
  reference_2: plan_id
});
```

## What This Does

After successful payment:
1. User completes payment on Billplz
2. Billplz redirects to: `https://www.cepatbina.com/thank-you?billplz[id]=xxx&billplz[paid]=true...`
3. Thank You page shows payment details
4. User clicks "Go to Billing Dashboard"
5. Shows Active subscription + billing history

## Current Flow

✅ Thank You page created
✅ Route added to App.tsx
✅ Billing history display added
⏳ **Need to update Edge Function redirect** (do this in Supabase Dashboard)
