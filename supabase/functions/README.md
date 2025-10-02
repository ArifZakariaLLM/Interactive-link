# Supabase Edge Functions

## Deploying the Billplz Payment Function

### Prerequisites
1. Install Supabase CLI: `npm install -g supabase`
2. Login to Supabase: `supabase login`
3. Link your project: `supabase link --project-ref your-project-ref`

### Set Environment Secrets

The Edge Function requires these environment variables:

```bash
# Set Billplz API credentials
supabase secrets set BILLPLZ_API_KEY=your_billplz_api_key
supabase secrets set BILLPLZ_COLLECTION_ID=your_billplz_collection_id

# Set your app URL (for callbacks)
supabase secrets set APP_URL=https://your-app-url.com

# Supabase automatically provides:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

### Deploy the Function

```bash
# Deploy the create-billplz-payment function
supabase functions deploy create-billplz-payment

# View logs
supabase functions logs create-billplz-payment
```

### Test the Function

You can test the function locally:

```bash
# Start local Supabase
supabase start

# Serve the function locally
supabase functions serve create-billplz-payment --env-file .env.local

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/create-billplz-payment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "test-user-id",
    "plan_id": "pro-monthly",
    "amount": 99.00,
    "currency": "MYR",
    "description": "Pro Plan Subscription",
    "customer_email": "test@example.com",
    "customer_name": "Test User"
  }'
```

### Function Endpoints

Production: `https://your-project-ref.supabase.co/functions/v1/create-billplz-payment`

Local: `http://localhost:54321/functions/v1/create-billplz-payment`

## Webhook Setup

To handle Billplz payment callbacks, you'll need to create a webhook handler:

1. Create `supabase/functions/billplz-webhook/index.ts`
2. Deploy it: `supabase functions deploy billplz-webhook`
3. Set the callback URL in Billplz dashboard to: `https://your-project-ref.supabase.co/functions/v1/billplz-webhook`

The webhook should:
- Verify the payment status from Billplz
- Update the payment record in the database
- Activate the user's subscription
- Send confirmation email
