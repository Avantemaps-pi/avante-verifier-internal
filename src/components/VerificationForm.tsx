import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePiAuth } from "@/contexts/PiAuthContext";

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
  const { user } = usePiAuth();
  
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
    if (!walletAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    if (!businessName.trim()) {
      toast.error("Please enter a business name");
      return;
    }

    setIsVerifying(true);
    onVerificationComplete(null);

    try {
      // Use persistent user identifier (Pi user ID or session ID)
      const externalUserId = getExternalUserId();
      
      const { data, error } = await supabase.functions.invoke('verify-business', {
        body: { 
          walletAddress: walletAddress.trim(),
          businessName: businessName.trim(),
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
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error("Failed to verify business. Please try again.");
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
