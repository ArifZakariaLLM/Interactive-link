import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      // Get bill ID from URL params
      const billId = searchParams.get('billplz[id]') || searchParams.get('billplz_id');
      const isPaid = searchParams.get('billplz[paid]') || searchParams.get('paid');

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
        } else {
          setPayment({
            billplz_bill_id: paymentData.billplz_bill_id,
            amount: paymentData.amount,
            currency: paymentData.currency,
            status: paymentData.status,
            paid_at: paymentData.paid_at,
            plan_name: paymentData.metadata?.plan_id || 'Pro Plan'
          });
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
            {/* Success Icon */}
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>

            {/* Thank You Message */}
            <h1 className="text-4xl font-bold text-foreground mb-2">
              THANK YOU!
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Terima Kasih Kerana Membeli Dengan Kami
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

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-medium">
                🎉 Your subscription has been activated!
              </p>
              <p className="text-green-700 text-sm mt-1">
                You now have full access to all premium features.
              </p>
            </div>

            {/* Continue Button */}
            <Button 
              size="lg" 
              onClick={handleContinue}
              className="w-full sm:w-auto px-8"
            >
              Go to Billing Dashboard
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
