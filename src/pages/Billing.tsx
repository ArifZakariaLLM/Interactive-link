import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  Check, 
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  getUserSubscription,
  getSubscriptionPlans,
  getRemainingTrialDays,
  formatCurrency,
  formatDate,
  createBillplzPayment,
  createUserTrialSubscription,
  getUserPayments,
  type UserSubscription,
  type SubscriptionPlan,
  type Payment
} from '@/lib/billing';
import { toast } from 'sonner';

const Billing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadBillingData();
  }, [user, navigate]);

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's subscription
      let userSub = await getUserSubscription(user.id);

      // If no subscription, create trial
      if (!userSub) {
        toast.info('Creating your free 7-day trial...');
        await createUserTrialSubscription(user.id);
        userSub = await getUserSubscription(user.id);
      }

      setSubscription(userSub);

      // Get available plans
      const availablePlans = await getSubscriptionPlans();

      // Get payment history
      const userPayments = await getUserPayments(user.id);
      setPayments(userPayments);
      
      // If no plans in database, use default plan
      if (!availablePlans || availablePlans.length === 0) {
        const defaultPlan: SubscriptionPlan = {
          id: 'pro-monthly',
          name: 'Pro Plan',
          description: 'Full access to all premium features',
          price: 1.00,
          currency: 'MYR',
          interval_type: 'month',
          interval_count: 1,
          features: [
            'Unlimited projects',
            'Custom domain support',
            'Priority support',
            'Advanced analytics',
            'API access',
            'No watermark'
          ],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setPlans([defaultPlan]);
      } else {
        setPlans(availablePlans);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!user) return;

    setProcessingPayment(true);
    
    // Dismiss any existing toasts
    toast.dismiss();
    
    try {
      // Show payment processing
      const loadingToast = toast.loading('Creating payment session...');
      
      // Create payment record (calls real Billplz API via Edge Function)
      const result = await createBillplzPayment(user.id, planId);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if (result && result.payment_url) {
        // IMMEDIATE REDIRECT to payment gateway (like PHP: header('Location: ...'))
        toast.success('Redirecting to Billplz payment gateway...');
        
        // Redirect immediately to real Billplz payment page
        window.location.href = result.payment_url;
        
        // Note: Code below won't execute because page will redirect
        // User will complete payment on Billplz → Billplz redirects back → Webhook activates subscription
      } else {
        toast.error('Failed to create payment session. Please try again.');
        setProcessingPayment(false);
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      
      // Dismiss any loading toasts
      toast.dismiss();
      
      // Show specific error message based on error type
      let errorMessage = 'Payment processing failed. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('Edge Function is not deployed') || 
            error.message.includes('Edge Function not deployed') ||
            error.message.includes('not accessible') ||
            error.message.includes('Payment system not configured')) {
          errorMessage = '⚠️ Payment Edge Function not deployed. Please deploy it first:\n\nsupabase functions deploy create-billplz-payment';
        } else if (error.message.includes('404')) {
          errorMessage = '⚠️ Payment service not found (404). The Edge Function needs to be deployed.';
        } else if (error.message.includes('500') || error.message.includes('Server error')) {
          errorMessage = '⚠️ Server error. Check Edge Function logs:\n\nsupabase functions logs create-billplz-payment';
        } else if (error.message.includes('Billplz credentials')) {
          errorMessage = '⚠️ Billplz credentials not configured. Set them with:\n\nsupabase secrets set BILLPLZ_API_KEY=your-key';
        } else {
          // Use the error message as-is (it's already descriptive)
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, {
        duration: 6000, // Show for 6 seconds
      });
      
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const remainingDays = getRemainingTrialDays(subscription);
  const isOnTrial = subscription?.status === 'trial';
  const isActive = subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Billing & Subscription
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Current Subscription Status */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Current Subscription
                {isOnTrial && (
                  <Badge variant="secondary" className="ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Trial
                  </Badge>
                )}
                {isActive && (
                  <Badge className="ml-2 bg-green-500">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isOnTrial && 'You are currently on a free trial'}
                {isActive && 'Your subscription is active'}
                {!isOnTrial && !isActive && 'No active subscription'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOnTrial && (
                <>
                  <Alert className="mb-4">
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      You have <strong>{remainingDays} days</strong> remaining in your trial.
                      Upgrade now to continue enjoying all features!
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trial Started:</span>
                      <span className="font-medium">
                        {subscription?.trial_start_date && formatDate(subscription.trial_start_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trial Ends:</span>
                      <span className="font-medium">
                        {subscription?.trial_end_date && formatDate(subscription.trial_end_date)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {isActive && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">Pro Plan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing Period:</span>
                    <span className="font-medium">Monthly</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Billing Date:</span>
                    <span className="font-medium">
                      {subscription?.current_period_end && formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                </div>
              )}

              {!isOnTrial && !isActive && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your trial has expired. Please upgrade to continue using premium features.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">
                    {isOnTrial && `${remainingDays} Days`}
                    {isActive && 'Active'}
                    {!isOnTrial && !isActive && 'Expired'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isOnTrial && 'Trial remaining'}
                    {isActive && 'Subscription status'}
                    {!isOnTrial && !isActive && 'Please renew'}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Features</div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Unlimited projects
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Custom domains
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Priority support
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Plans - Show for trial users AND expired/no subscription users */}
        {(isOnTrial || !isActive) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              {isOnTrial ? 'Upgrade to Pro' : 'Choose Your Plan'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isOnTrial 
                ? 'Upgrade now to continue enjoying all features after your trial ends' 
                : 'Subscribe to unlock all premium features and continue building'}
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative overflow-hidden border-2 hover:border-primary transition-colors">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                    BEST VALUE
                  </div>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="text-3xl font-bold">
                        {formatCurrency(plan.price, plan.currency)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        per {plan.interval_type}
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {Array.isArray(plan.features) && plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          {isOnTrial ? 'Upgrade Now' : 'Subscribe Now'}
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground mt-3">
                      Cancel anytime • Instant activation
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>
              View your past invoices and payment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No billing history yet</p>
                <p className="text-sm">Your payment history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        payment.status === 'paid' ? 'bg-green-100' :
                        payment.status === 'pending' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        <CreditCard className={`h-4 w-4 ${
                          payment.status === 'paid' ? 'text-green-600' :
                          payment.status === 'pending' ? 'text-yellow-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.paid_at || payment.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        payment.status === 'paid' ? 'default' :
                        payment.status === 'pending' ? 'secondary' :
                        'destructive'
                      }>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                      {payment.billplz_bill_id && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {payment.billplz_bill_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;
