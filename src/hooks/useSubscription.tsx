import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePiAuth } from "@/contexts/PiAuthContext";

interface Subscription {
  id: string;
  external_user_id: string;
  tier: "free" | "basic" | "professional" | "enterprise";
  billing_period: "monthly" | "annual" | null;
  verifications_used: number;
  verifications_limit: number;
  started_at: string;
  expires_at: string | null;
}

interface VerificationAllowance {
  allowed: boolean;
  remaining: number;
  tier: "free" | "basic" | "professional" | "enterprise";
  expires_at: string | null;
}

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

export function useSubscription() {
  const { user } = usePiAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getExternalUserId = useCallback((): string => {
    if (user?.uid) {
      return user.uid;
    }
    return getOrCreateSessionId();
  }, [user?.uid]);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const externalUserId = getExternalUserId();
      
      // Use edge function instead of direct database query for security
      const { data, error: fnError } = await supabase.functions.invoke('get-subscription-status', {
        body: { externalUserId, includeFullSubscription: true }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.success && data?.subscription) {
        setSubscription(data.subscription as Subscription);
      } else if (data?.success && data?.data) {
        // Fallback to allowance data if full subscription not returned
        setSubscription({
          id: '',
          external_user_id: externalUserId,
          tier: data.data.tier || 'free',
          billing_period: null,
          verifications_used: data.data.remaining !== undefined 
            ? (tierConfig[data.data.tier as keyof typeof tierConfig]?.limit || 1) - data.data.remaining
            : 0,
          verifications_limit: tierConfig[data.data.tier as keyof typeof tierConfig]?.limit || 1,
          started_at: new Date().toISOString(),
          expires_at: data.data.expires_at || null,
        });
      } else {
        // No subscription found, default to enterprise tier
        setSubscription({
          id: '',
          external_user_id: externalUserId,
          tier: 'enterprise',
          billing_period: null,
          verifications_used: 0,
          verifications_limit: 999999,
          started_at: new Date().toISOString(),
          expires_at: null,
        });
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [getExternalUserId]);

  const checkVerificationAllowance = useCallback(async (): Promise<VerificationAllowance | null> => {
    try {
      const externalUserId = getExternalUserId();
      
      // Call edge function instead of direct RPC (RPC is now restricted to service_role)
      const { data, error: fnError } = await supabase.functions.invoke('get-subscription-status', {
        body: { externalUserId }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.success && data?.data) {
        return data.data as VerificationAllowance;
      }

      return null;
    } catch (err) {
      console.error('Error checking verification allowance:', err);
      return null;
    }
  }, [getExternalUserId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const tierConfig = {
    free: { name: 'Free', limit: 1, color: 'text-muted-foreground' },
    basic: { name: 'Basic', limit: 5, color: 'text-blue-500' },
    professional: { name: 'Professional', limit: 50, color: 'text-purple-500' },
    enterprise: { name: 'Enterprise', limit: Infinity, color: 'text-amber-500' },
  };

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
    checkVerificationAllowance,
    tierConfig,
    getExternalUserId,
  };
}
