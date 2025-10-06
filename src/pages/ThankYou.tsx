import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/billing';

interface PaymentDetails {
  billplz_bill_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  plan_name: string;
}

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [isPaymentSuccessful, setIsPaymentSuccessful] = useState(false);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      // Get bill ID from URL params (handles both Billplz redirect format and our direct links)
      const billId = searchParams.get('billplz[id]') || 
                     searchParams.get('billplz_id') || 
                     searchParams.get('bill_id');
      const isPaid = searchParams.get('billplz[paid]') || searchParams.get('paid');
      
      // Check if payment was actually paid (Billplz returns 'true' for paid, 'false' for cancelled)
      const paidStatus = isPaid === 'true' || isPaid === '1';
      
      console.log('Payment URL params:', { billId, isPaid, paidStatus });

      if (!billId) {
        // No bill ID, redirect to billing
        setTimeout(() => navigate('/billing'), 2000);
        return;
      }

      try {
        // Fetch payment details from database
        const { data: paymentData, error } = await supabase
          .from('payments')
          .select(`
            billplz_bill_id,
            amount,
            currency,
            status,
            paid_at,
            metadata
          `)
          .eq('billplz_bill_id', billId)
          .single();

        if (error || !paymentData) {
          console.error('Error fetching payment:', error);
          // If no payment data and isPaid is false, it's a cancelled payment
          setIsPaymentSuccessful(paidStatus);
        } else {
          setPayment({
            billplz_bill_id: paymentData.billplz_bill_id,
            amount: paymentData.amount,
            currency: paymentData.currency,
            status: paymentData.status,
            paid_at: paymentData.paid_at,
            plan_name: paymentData.metadata?.plan_id || 'Pro Plan'
          });
          // Check if payment status is 'paid' OR if Billplz returned paid=true
          setIsPaymentSuccessful(paymentData.status === 'paid' || paidStatus);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [searchParams, navigate]);

  const handleContinue = () => {
    navigate('/billing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            {/* Success or Failed Icon */}
            {isPaymentSuccessful ? (
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            ) : (
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
            )}

            {/* Thank You or Failed Message */}
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {isPaymentSuccessful ? 'THANK YOU!' : 'PAYMENT CANCELLED'}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {isPaymentSuccessful 
                ? 'Terima Kasih Kerana Membeli Dengan Kami' 
                : 'Your payment was cancelled or failed'}
            </p>

            {/* Payment Details */}
            {payment && (
              <div className="bg-muted rounded-lg p-6 mb-6 text-left">
                <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium">{payment.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">{formatCurrency(payment.amount, payment.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium">Billplz (Online Banking)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium text-green-600">
                      {payment.status === 'paid' ? '✓ Paid' : 'Processing'}
                    </span>
                  </div>
                  {payment.paid_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid At:</span>
                      <span className="font-medium">{formatDate(payment.paid_at)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-sm">{payment.billplz_bill_id}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Success or Failed Message */}
            {isPaymentSuccessful ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-medium">
                  🎉 Your subscription has been activated!
                </p>
                <p className="text-green-700 text-sm mt-1">
                  You now have full access to all premium features.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 font-medium">
                  ❌ Payment Failed or Cancelled
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Your payment was not completed. No charges were made to your account.
                </p>
              </div>
            )}

            {/* Continue Button */}
            <Button 
              size="lg" 
              onClick={handleContinue}
              className="w-full sm:w-auto px-8"
            >
              {isPaymentSuccessful ? 'Go to Billing Dashboard' : 'Try Again'}
            </Button>

            {/* Footer */}
            <p className="text-sm text-muted-foreground mt-8">
              Copyright ©2024 | All Rights Reserved
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThankYou;
