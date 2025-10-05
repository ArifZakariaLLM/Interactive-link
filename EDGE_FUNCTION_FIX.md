# Fix: Email Invalid Error from Billplz

## Problem
Billplz is rejecting the email as invalid.

## Solution
Update the Edge Function to add logging and ensure email is valid.

## Steps:

### 1. Go to Supabase Dashboard
https://supabase.com/dashboard/project/mvmwcgnlebbesarvsvxk/functions

### 2. Click on `create-billplz-payment` function

### 3. Click "Edit" or go to the code editor

### 4. Add this logging RIGHT AFTER receiving the request:

Find this section (around line 50):
```typescript
const requestBody: BillplzRequest = await req.json()
const { user_id, plan_id, amount, currency, description, customer_email, customer_name } = requestBody
```

Add these console logs RIGHT AFTER:
```typescript
console.log('Received payment request:', {
  user_id,
  plan_id,
  amount,
  customer_email,
  customer_name,
  email_type: typeof customer_email,
  email_value: customer_email
});
```

### 5. Also add logging before calling Billplz API:

Find this section (around line 80):
```typescript
const billplzData = {
  collection_id: BILLPLZ_COLLECTION_ID,
  email: customer_email,
  name: customer_name,
  ...
}
```

Add RIGHT AFTER:
```typescript
console.log('Sending to Billplz:', {
  email: billplzData.email,
  name: billplzData.name,
  amount: billplzData.amount
});
```

### 6. Save and Deploy

Click "Deploy" button.

### 7. Test Again

Click "Subscribe Now" in your app.

### 8. Check Logs

In PowerShell:
```powershell
npx supabase functions logs create-billplz-payment --limit 20
```

Look for the console.log output showing what email is being sent.

## Quick Alternative Fix

If the email is coming through as undefined, add this validation in the Edge Function:

Find this line (around line 60):
```typescript
if (!user_id || !plan_id || !amount || !customer_email || !customer_name) {
```

Change to:
```typescript
if (!user_id || !plan_id || !amount) {
  return new Response(
    JSON.stringify({ error: 'Missing required fields: user_id, plan_id, or amount' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Validate email specifically
if (!customer_email || typeof customer_email !== 'string' || !customer_email.includes('@')) {
  console.error('Invalid email:', customer_email);
  return new Response(
    JSON.stringify({ 
      error: 'Invalid email address',
      received_email: customer_email,
      email_type: typeof customer_email
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Use fallback name if missing
const finalName = customer_name || customer_email.split('@')[0] || 'Customer';
```

Then use `finalName` instead of `customer_name` when creating billplzData.

This will give us better error messages showing EXACTLY what's wrong with the email!
