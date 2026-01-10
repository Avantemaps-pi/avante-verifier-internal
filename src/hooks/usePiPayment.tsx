import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePiAuth } from '@/contexts/PiAuthContext';
import type { PiPaymentData, PiPaymentRequest, PiPaymentCallbacks } from '@/types/pi-sdk';

// Get or create a persistent session ID for anonymous users
function getOrCreateSessionId(): string {
  const STORAGE_KEY = 'verificationSessionId';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = `session_${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  return sessionId;
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  txid?: string;
  error?: string;
}

interface UsePiPaymentOptions {
  onSuccess?: (paymentId: string, txid: string) => void;
  onError?: (error: Error) => void;
  onCancel?: (paymentId: string) => void;
}

export const usePiPayment = (options: UsePiPaymentOptions = {}) => {
  const { user } = usePiAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<string | null>(null);

  // Get persistent user identifier: Pi user ID if logged in, otherwise session ID
  const getExternalUserId = useCallback((): string => {
    if (user?.uid) {
      return user.uid;
    }
    return getOrCreateSessionId();
  }, [user?.uid]);

  const approvePayment = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-pi-payment', {
        body: { paymentId },
      });

      if (error) {
        console.error('Payment approval error:', error);
        return false;
      }

      return data?.success ?? false;
    } catch (error) {
      console.error('Failed to approve payment:', error);
      return false;
    }
  }, []);

  const completePayment = useCallback(async (paymentId: string, txid: string): Promise<boolean> => {
    try {
      const externalUserId = getExternalUserId();
      const { data, error } = await supabase.functions.invoke('complete-pi-payment', {
        body: { paymentId, txid, externalUserId },
      });

      if (error) {
        console.error('Payment completion error:', error);
        return false;
      }

      return data?.success ?? false;
    } catch (error) {
      console.error('Failed to complete payment:', error);
      return false;
    }
  }, [getExternalUserId]);

  const createPayment = useCallback(async (
    amount: number,
    memo: string,
    metadata: Record<string, unknown> = {}
  ): Promise<PaymentResult> => {
    if (!window.Pi) {
      toast.error('Pi SDK not available. Please open this app in Pi Browser.');
      return { success: false, error: 'Pi SDK not available' };
    }

    setIsProcessing(true);

    return new Promise((resolve) => {
      const paymentData: PiPaymentRequest = {
        amount,
        memo,
        metadata,
      };

      const callbacks: PiPaymentCallbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('Payment ready for approval:', paymentId);
          setCurrentPayment(paymentId);
          
          const approved = await approvePayment(paymentId);
          if (!approved) {
            toast.error('Payment approval failed. Please try again.');
            setIsProcessing(false);
            resolve({ success: false, paymentId, error: 'Approval failed' });
          }
        },

        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log('Payment ready for completion:', paymentId, txid);
          
          const completed = await completePayment(paymentId, txid);
          if (completed) {
            toast.success('Payment completed successfully!');
            options.onSuccess?.(paymentId, txid);
            resolve({ success: true, paymentId, txid });
          } else {
            toast.error('Payment completion failed.');
            resolve({ success: false, paymentId, txid, error: 'Completion failed' });
          }
          
          setIsProcessing(false);
          setCurrentPayment(null);
        },

        onCancel: (paymentId: string) => {
          console.log('Payment cancelled:', paymentId);
          toast.info('Payment was cancelled.');
          options.onCancel?.(paymentId);
          setIsProcessing(false);
          setCurrentPayment(null);
          resolve({ success: false, paymentId, error: 'Cancelled' });
        },

        onError: (error: Error, payment?: PiPaymentData) => {
          console.error('Payment error:', error, payment);
          toast.error(`Payment error: ${error.message}`);
          options.onError?.(error);
          setIsProcessing(false);
          setCurrentPayment(null);
          resolve({ success: false, paymentId: payment?.identifier, error: error.message });
        },
      };

      try {
        window.Pi.createPayment(paymentData, callbacks);
      } catch (error) {
        console.error('Failed to create payment:', error);
        setIsProcessing(false);
        resolve({ success: false, error: 'Failed to create payment' });
      }
    });
  }, [approvePayment, completePayment, options]);

  return {
    createPayment,
    isProcessing,
    currentPayment,
  };
};
