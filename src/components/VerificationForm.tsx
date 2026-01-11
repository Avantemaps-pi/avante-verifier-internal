import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePiAuth } from "@/contexts/PiAuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { z } from "zod";

// Validation schema for verification form
const verificationSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, "Business name is required")
    .max(200, "Business name must be less than 200 characters")
    .regex(/^[a-zA-Z0-9\s\-_.&']+$/, "Business name contains invalid characters"),
  walletAddress: z
    .string()
    .trim()
    .min(1, "Wallet address is required")
    .length(56, "Pi wallet address must be exactly 56 characters")
    // Stellar-style addresses are base32: A-Z and 2-7 (no 0/1/8/9)
    .regex(/^G[A-Z2-7]{55}$/, "Invalid Pi wallet address format (A-Z and 2-7 only, must start with G)"),
});

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

interface VerificationResult {
  verificationId: string;
  walletAddress: string;
  businessName: string;
  totalTransactions: number;
  uniqueWallets: number;
  meetsRequirements: boolean;
  failureReason: string | null;
  verificationStatus: string;
  verifiedAt: string;
}

interface VerificationFormProps {
  onVerificationComplete: (result: VerificationResult | null) => void;
  piUsername?: string;
}

export const VerificationForm = ({ onVerificationComplete, piUsername }: VerificationFormProps) => {
  const [walletAddress, setWalletAddress] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const { user } = usePiAuth();
  const { checkVerificationAllowance, refetch: refetchSubscription, subscription } = useSubscription();
  
  // Show logged-in username indicator if available
  const usernameDisplay = piUsername ? `@${piUsername}` : null;

  // Get persistent user identifier: Pi user ID if logged in, otherwise session ID
  const getExternalUserId = (): string => {
    if (user?.uid) {
      return user.uid;
    }
    return getOrCreateSessionId();
  };

  const handleVerify = async () => {
    // Validate inputs with zod
    const validationResult = verificationSchema.safeParse({
      businessName,
      walletAddress,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    // Check verification allowance before proceeding
    const allowance = await checkVerificationAllowance();
    if (!allowance?.allowed) {
      setQuotaExceeded(true);
      toast.error("Verification limit reached", {
        description: `Your ${allowance?.tier || 'free'} plan has no remaining verifications. Please upgrade to continue.`,
      });
      return;
    }

    setQuotaExceeded(false);
    setIsVerifying(true);
    onVerificationComplete(null);

    try {
      // Use persistent user identifier (Pi user ID or session ID)
      const externalUserId = getExternalUserId();
      const validData = validationResult.data;
      
      const { data, error } = await supabase.functions.invoke('verify-business', {
        body: { 
          walletAddress: validData.walletAddress,
          businessName: validData.businessName,
          externalUserId
        }
      });

      if (error) throw error;

      if (data.success && data.data) {
        if (data.data.meetsRequirements) {
          toast.success("Business verified successfully - Approved");
        } else {
          toast.error(`Verification failed: ${data.data.failureReason}`);
        }
        onVerificationComplete(data.data);
        // Refresh subscription to update usage count
        refetchSubscription();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (error) {
      console.error('Verification error:', error);

      const maybeBody = (error as any)?.context?.body;
      if (typeof maybeBody === 'string') {
        try {
          const parsed = JSON.parse(maybeBody);
          if (parsed?.error) {
            toast.error(parsed.error);
            return;
          }
        } catch {
          // ignore JSON parse failures
        }
      }

      toast.error((error as any)?.message || "Failed to verify business. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl p-8 bg-gradient-to-br from-card to-card/50 border-border/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">Verify Business</h2>
            {usernameDisplay && (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {usernameDisplay}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Enter Pi Network wallet address</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="businessName" className="text-sm font-medium text-foreground">
            Business Name
          </label>
          <Input
            id="businessName"
            type="text"
            placeholder="Acme Corporation"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
            disabled={isVerifying}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="wallet" className="text-sm font-medium text-foreground">
            Pi Wallet Address
          </label>
          <Input
            id="wallet"
            type="text"
            placeholder="GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
            disabled={isVerifying}
          />
        </div>

        {/* Quota Exceeded Warning */}
        {quotaExceeded && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Verification limit reached for your {subscription?.tier || 'free'} plan.{' '}
              <button
                onClick={() => {
                  const pricingSection = document.getElementById('features');
                  if (pricingSection) {
                    pricingSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="underline font-medium hover:text-destructive/80"
              >
                Upgrade now
              </button>
            </span>
          </div>
        )}

        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Business"
          )}
        </Button>
      </div>
    </Card>
  );
};
