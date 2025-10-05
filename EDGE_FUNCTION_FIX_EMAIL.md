# Fix: Email Validation Issue

## Problem
Billplz is rejecting the email with error: `"Email is invalid"`

## Solution
Update your Edge Function in Supabase Dashboard with this fixed code:

## Updated Edge Function Code

Replace the ENTIRE Edge Function with this:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const BILLPLZ_API_KEY = Deno.env.get('BILLPLZ_API_KEY');
const BILLPLZ_COLLECTION_ID = Deno.env.get('BILLPLZ_COLLECTION_ID');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';
const BILLPLZ_BASE_URL = 'https://www.billplz.com/api/v3';

// Email validation regex
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const handler = async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    
    // Check if it's a webhook from Billplz (form data)
    if (req.method === 'POST' && contentType.includes('application/x-www-form-urlencoded')) {
      console.log('Webhook received from Billplz');
      return await handleWebhook(req);
    }

    // Regular API call from frontend (JSON)
    const body = await req.json();
    return await createBill(body);
    
  } catch (error) {
    console.error('Error in create-billplz-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

// Create bill function
async function createBill(body) {
  const { user_id, plan_id, amount, customer_email, customer_name } = body;

  console.log('Creating bill for:', { user_id, customer_email, customer_name, amount });

  // Validate
  if (!BILLPLZ_API_KEY || !BILLPLZ_COLLECTION_ID) {
    throw new Error('Billplz credentials not configured');
  }

  if (!user_id || !plan_id || !amount || !customer_email || !customer_name) {
    throw new Error('Missing required fields');
  }

  // Validate email format
  if (!isValidEmail(customer_email)) {
    console.error('Invalid email format:', customer_email);
    throw new Error(`Invalid email format: ${customer_email}. Please use a valid email address.`);
  }

  console.log('Email validation passed:', customer_email);

  // Get or create subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let subscriptionId = subscription?.id;

  if (!subscriptionId) {
    const { data: newSub } = await supabase.rpc('create_trial_subscription', {
      p_user_id: user_id
    });
    subscriptionId = newSub;
  }

  // Create payment record first
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id,
      subscription_id: subscriptionId,
      amount,
      currency: 'MYR',
      status: 'pending',
      payment_method: 'billplz',
      metadata: { plan_id }
    })
    .select()
    .single();

  if (paymentError) {
    console.error('Error creating payment:', paymentError);
    throw new Error('Failed to create payment record');
  }

  // Prepare Billplz request - amount in CENTS (RM 1.00 = 100 cents)
  const amountInCents = Math.round(amount * 100);
  
  console.log('Preparing Billplz request:', {
    collection_id: BILLPLZ_COLLECTION_ID,
    email: customer_email,
    name: customer_name,
    amount: amountInCents,
    description: `Subscription - ${plan_id}`
  });

  const billplzData = new URLSearchParams({
    collection_id: BILLPLZ_COLLECTION_ID,
    email: customer_email.trim(), // Trim whitespace
    name: customer_name.trim(),
    amount: amountInCents.toString(),
    description: `Subscription - ${plan_id}`,
    callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-billplz-payment`,
    redirect_url: `${APP_URL}/thank-you`,
    reference_1_label: 'user_id',
    reference_1: user_id,
    reference_2_label: 'plan_id',
    reference_2: plan_id
  });

  // Call Billplz API
  console.log('Calling Billplz API...');
  const response = await fetch(`${BILLPLZ_BASE_URL}/bills`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(BILLPLZ_API_KEY + ':')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: billplzData.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Billplz API error:', errorText);
    throw new Error(`Billplz API error: ${errorText}`);
  }

  const billData = await response.json();
  console.log('Billplz bill created:', billData.id);

  // Update payment with Billplz info
  await supabase
    .from('payments')
    .update({
      billplz_bill_id: billData.id,
      billplz_url: billData.url,
      metadata: { ...payment.metadata, billplz_data: billData }
    })
    .eq('id', payment.id);

  return new Response(
    JSON.stringify({
      success: true,
      payment_id: billData.id,
      payment_url: billData.url
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

// Webhook handler - CRITICAL for automatic subscription activation!
async function handleWebhook(req) {
  console.log('Processing Billplz webhook...');
  
  try {
    const formData = await req.formData();
    
    // Parse Billplz webhook data
    const billplz_id = formData.get('id') || formData.get('billplz[id]');
    const billplz_paid = formData.get('paid') || formData.get('billplz[paid]');
    const billplz_paid_at = formData.get('paid_at') || formData.get('billplz[paid_at]');

    console.log('Webhook data:', { billplz_id, billplz_paid, billplz_paid_at });

    if (!billplz_id) {
      return new Response('Missing bill ID', { status: 400 });
    }

    // Find payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('billplz_bill_id', billplz_id)
      .maybeSingle();

    if (paymentError || !payment) {
      console.error('Payment not found:', billplz_id);
      return new Response('Payment not found', { status: 404 });
    }

    // Update payment status
    const newStatus = billplz_paid === 'true' ? 'paid' : 'failed';
    const paid_at = billplz_paid === 'true' && billplz_paid_at 
      ? new Date(billplz_paid_at).toISOString() 
      : null;

    await supabase
      .from('payments')
      .update({
        status: newStatus,
        paid_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    console.log('Payment updated:', newStatus);

    // If payment successful, activate subscription!
    if (billplz_paid === 'true' && payment.subscription_id) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: nextMonth.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.subscription_id);

      console.log('✅ Subscription activated for user:', payment.user_id);
    }

    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

serve(handler);
```

## Key Changes:

1. **Email validation** - Checks email format before sending to Billplz
2. **Email trimming** - Removes whitespace that might cause issues  
3. **Better error messages** - Shows which email is invalid
4. **Better logging** - Helps debug issues

## How to Update:

1. Go to: https://supabase.com/dashboard/project/mvmwcgnlebbesarvsvxk/functions
2. Click on `create-billplz-payment`
3. **Replace ALL the code** with the code above
4. Click "Deploy"
5. Test payment again

## After Update:

The payment should work! The email will be validated and trimmed before sending to Billplz.
