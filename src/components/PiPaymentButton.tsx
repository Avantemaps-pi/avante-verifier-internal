import React from 'react';
import { Button } from '@/components/ui/button';
import { Coins, Loader2 } from 'lucide-react';
import { usePiPayment } from '@/hooks/usePiPayment';
import { usePiAuth } from '@/contexts/PiAuthContext';

interface PiPaymentButtonProps {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (paymentId: string, txid: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const PiPaymentButton: React.FC<PiPaymentButtonProps> = ({
  amount,
  memo,
  metadata = {},
  onSuccess,
  onError,
  disabled = false,
  className = '',
  children,
}) => {
  const { user, isSDKReady } = usePiAuth();
  const { createPayment, isProcessing } = usePiPayment({
    onSuccess,
    onError,
  });

  const handlePayment = async () => {
    if (!user) {
      return;
    }
    await createPayment(amount, memo, metadata);
  };

  const isDisabled = disabled || isProcessing || !user || !isSDKReady;

  return (
    <Button
      onClick={handlePayment}
      disabled={isDisabled}
      className={className}
      variant="default"
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Coins className="mr-2 h-4 w-4" />
          {children || `Pay ${amount} π`}
        </>
      )}
    </Button>
  );
};
