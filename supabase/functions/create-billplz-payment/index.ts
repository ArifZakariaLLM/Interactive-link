// Supabase Edge Function to create Billplz payment
// This keeps API keys secure on the server-side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BillplzRequest {
  user_id: string;
  plan_id?: string;
  project_id?: string;
  amount: number;
  currency: string;
  description: string;
  customer_email: string;
  customer_name: string;
}

interface BillplzResponse {
  id: string;
  url: string;
  collection_id: string;
  paid: boolean;
  state: string;
  amount: number;
  paid_amount: number;
  due_at: string;
  email: string;
  mobile: string | null;
  name: string;
  description: string;
  callback_url: string;
  redirect_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Billplz API credentials from environment
    const BILLPLZ_API_KEY = Deno.env.get('BILLPLZ_API_KEY')
    const BILLPLZ_COLLECTION_ID = Deno.env.get('BILLPLZ_COLLECTION_ID')
    const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173'

    if (!BILLPLZ_API_KEY || !BILLPLZ_COLLECTION_ID) {
      throw new Error('Billplz credentials not configured')
    }

    // Parse request body
    const requestBody: BillplzRequest = await req.json()
    const { user_id, plan_id, amount, currency, description, customer_email, customer_name } = requestBody

    // Validate required fields
    if (!user_id || !plan_id || !amount || !customer_email || !customer_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convert amount to cents (Billplz requires amount in cents)
    const amountInCents = Math.round(amount * 100)

    // Prepare callback and redirect URLs
    const callbackUrl = `${APP_URL}/api/billplz-webhook`
    const redirectUrl = `${APP_URL}/thank-you`

    // Prepare Billplz API request
    const billplzData = {
      collection_id: BILLPLZ_COLLECTION_ID,
      email: customer_email,
      name: customer_name,
      amount: amountInCents,
      description: description || `Subscription - ${plan_id}`,
      callback_url: callbackUrl,
      redirect_url: redirectUrl,
      reference_1: user_id,
      reference_1_label: 'user_id',
      reference_2: plan_id,
      reference_2_label: 'plan_id'
    }

    // Call Billplz API to create bill
    const billplzResponse = await fetch('https://www.billplz.com/api/v3/bills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(BILLPLZ_API_KEY + ':')
      },
      body: JSON.stringify(billplzData)
    })

    if (!billplzResponse.ok) {
      const errorText = await billplzResponse.text()
      console.error('Billplz API Error:', errorText)
      throw new Error(`Billplz API error: ${billplzResponse.status}`)
    }

    const billplzResult: BillplzResponse = await billplzResponse.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get or create user's subscription
    const { data: subscription } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let subscriptionId = subscription?.id

    // If no subscription exists, create trial first
    if (!subscriptionId) {
      const { data: newSub } = await supabaseClient.rpc('create_trial_subscription', {
        p_user_id: user_id
      })
      subscriptionId = newSub
    }

    // Save payment record to database
    await supabaseClient
      .from('payments')
      .insert({
        user_id: user_id,
        subscription_id: subscriptionId,
        amount: amount,
        currency: currency || 'MYR',
        status: 'pending',
        payment_method: 'billplz',
        billplz_bill_id: billplzResult.id,
        billplz_url: billplzResult.url,
        metadata: {
          plan_id: plan_id,
          billplz_collection_id: billplzResult.collection_id,
          billplz_state: billplzResult.state
        }
      })

    // Return payment URL to frontend
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: billplzResult.id,
        payment_url: billplzResult.url,
        amount: billplzResult.amount,
        description: billplzResult.description
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating Billplz payment:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create payment',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
