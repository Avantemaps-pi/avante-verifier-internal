import { useState } from "react";
import { VerificationForm } from "@/components/VerificationForm";
import { VerificationResults } from "@/components/VerificationResults";
import { SubscriptionManagement } from "@/components/SubscriptionManagement";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { usePiAuth } from "@/contexts/PiAuthContext";
interface VerificationData {
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

const Index = () => {
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const { user } = usePiAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-destructive/5 pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-destructive/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <Header />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-4xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
              Avante Business
              <span className="block bg-gradient-to-r from-primary via-primary to-destructive bg-clip-text text-transparent">
                Verifier
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Verify Pi Network wallet activity for registered businesses in real-time
            </p>
          </div>

          {/* Verification Form and Subscription Status */}
          <div className="flex flex-col lg:flex-row gap-6 justify-center items-start">
            <VerificationForm 
              onVerificationComplete={setVerificationData} 
              piUsername={user?.username}
            />
            <SubscriptionManagement />
          </div>

          {/* Results */}
          {verificationData && (
            <div className="flex justify-center">
              <VerificationResults {...verificationData} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
