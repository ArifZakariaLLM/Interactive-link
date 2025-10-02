import { supabase } from '@/integrations/supabase/client';

// ================================================
// TYPES
// ================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval_type: string;
  description: string | null;
  features: string[];
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  plan_id: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string | null;
  billplz_bill_id: string | null;
  billplz_url: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ================================================
// SUBSCRIPTION MANAGEMENT
// ================================================

/**
 * Get user's current subscription
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data;
}

/**
 * Create a 7-day trial subscription for a new user
 */
export async function createUserTrialSubscription(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_trial_subscription', {
    p_user_id: userId
  });

  if (error) {
    console.error('Error creating trial:', error);
    return null;
  }

  return data;
}

/**
 * Check if user's trial is still active
 */
export function checkTrialStatus(subscription: UserSubscription | null): boolean {
  if (!subscription || subscription.status !== 'trial') return false;
  
  if (!subscription.trial_end_date) return false;
  
  const trialEndDate = new Date(subscription.trial_end_date);
  return trialEndDate > new Date();
}

/**
 * Get remaining trial days
 */
export function getRemainingTrialDays(subscription: UserSubscription | null): number {
  if (!subscription || subscription.status !== 'trial' || !subscription.trial_end_date) {
    return 0;
  }

  const trialEndDate = new Date(subscription.trial_end_date);
  const now = new Date();
  const diffTime = trialEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Update subscription status
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: 'trial' | 'active' | 'expired' | 'cancelled',
  periodEnd?: Date
): Promise<boolean> {
  const updateData: any = { status };
  
  if (periodEnd) {
    updateData.current_period_end = periodEnd.toISOString();
  }

  const { error } = await supabase
    .from('user_subscriptions')
    .update(updateData)
    .eq('id', subscriptionId);

  if (error) {
    console.error('Error updating subscription:', error);
    return false;
  }

  return true;
}

/**
 * Activate subscription after payment
 */
export async function activateSubscription(
  subscriptionId: string,
  planId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('activate_subscription', {
    p_subscription_id: subscriptionId,
    p_plan_id: planId
  });

  if (error) {
    console.error('Error activating subscription:', error);
    return false;
  }

  return data;
}

// ================================================
// SUBSCRIPTION PLANS
// ================================================

/**
 * Get all active subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    return [];
  }

  return data || [];
}

/**
 * Get Pro Plan specifically
 */
export async function getProPlan(): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', 'Pro Plan')
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching Pro Plan:', error);
    return null;
  }

  return data;
}

// ================================================
// PERMISSIONS
// ================================================

/**
 * Check if user can make calls (has active subscription)
 * Async version using database function
 */
export async function canMakeCalls(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_user_make_calls', {
    p_user_id: userId
  });

  if (error) {
    console.error('Error checking permissions:', error);
    return false;
  }

  return data || false;
}

/**
 * Check if user can make calls (synchronous version using subscription data)
 */
export function canMakeCallsSync(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;

  // Check trial status
  if (subscription.status === 'trial' && subscription.trial_end_date) {
    return new Date(subscription.trial_end_date) > new Date();
  }

  // Check active subscription
  if (subscription.status === 'active' && subscription.current_period_end) {
    return new Date(subscription.current_period_end) > new Date();
  }

  return false;
}

// ================================================
// PAYMENTS
// ================================================

/**
 * Get user's payment history
 */
export async function getUserPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a payment record for Billplz via Edge Function
 * This calls the real Billplz API and returns a real payment URL
 */
export async function createBillplzPayment(
  userId: string,
  planId: string
): Promise<{ payment_id: string; payment_url: string } | null> {
  try {
    // Get user info for payment
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) {
      throw new Error('User not authenticated or missing email');
    }

    // Get plan details
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get user's full name from profile
    let customerName = user.email.split('@')[0]; // Fallback to email username
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      
      if (profile?.full_name) {
        customerName = profile.full_name;
      }
    } catch (error) {
      console.warn('Could not fetch profile name:', error);
    }

    // Get Supabase URL and anon key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    // Call Edge Function to create real Billplz payment
    console.log('Calling Edge Function at:', `${supabaseUrl}/functions/v1/create-billplz-payment`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-billplz-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        currency: plan.currency || 'MYR',
        description: `${plan.name} - Subscription`,
        customer_email: user.email,
        customer_name: customerName
      })
    });

    console.log('Edge Function response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'Failed to create payment';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // If can't parse JSON, check if it's a 404 (function not deployed)
        if (response.status === 404) {
          errorMessage = 'Edge Function not deployed. Please deploy the create-billplz-payment function.';
        } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
      }
      
      console.error('Edge Function error:', errorMessage);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Edge Function result:', result);

    if (!result.success || !result.payment_url) {
      throw new Error('Invalid payment response from server');
    }

    // Return real payment data from Billplz
    return {
      payment_id: result.payment_id,
      payment_url: result.payment_url
    };
  } catch (error: any) {
    console.error('Error creating Billplz payment:', error);
    
    // Add more context to the error
    if (error.message.includes('Edge Function not deployed')) {
      throw new Error('Payment system not configured. Please contact support.');
    }
    
    throw error; // Re-throw to be handled by caller
  }
}

/**
 * Check Billplz payment status
 */
export async function checkBillplzPayment(billId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('billplz_bill_id', billId)
    .single();

  if (error) {
    console.error('Error checking payment:', error);
    return null;
  }

  return data;
}

// ================================================
// ADMIN/TESTING FUNCTIONS
// ================================================

/**
 * Manually upgrade user to Pro (for testing)
 */
export async function manualUpgradeUserToPro(userId: string): Promise<boolean> {
  try {
    const proPlan = await getProPlan();
    if (!proPlan) return false;

    let subscription = await getUserSubscription(userId);
    
    if (!subscription) {
      await createUserTrialSubscription(userId);
      subscription = await getUserSubscription(userId);
    }

    if (!subscription) return false;

    const success = await activateSubscription(subscription.id, proPlan.id);
    return success;
  } catch (error) {
    console.error('Error upgrading user:', error);
    return false;
  }
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'MYR'): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
