import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Wallet, Network, Building2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VerificationResultsProps {
  verificationId: string;
  walletAddress: string;
  businessName: string;
  totalTransactions: number;
  creditedTransactions?: number;
  uniqueWallets: number;
  meetsRequirements: boolean;
  failureReason: string | null;
  verificationStatus: string;
  verifiedAt: string;
}

export const VerificationResults = ({ 
  verificationId,
  walletAddress,
  businessName,
  totalTransactions,
  creditedTransactions,
  uniqueWallets,
  meetsRequirements,
  failureReason,
  verificationStatus,
  verifiedAt
}: VerificationResultsProps) => {
  const statusConfig = {
    approved: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/20", border: "border-green-500/30" },
    rejected: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/20", border: "border-red-500/30" },
    under_review: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/20", border: "border-yellow-500/30" }
  };

  const status = statusConfig[verificationStatus as keyof typeof statusConfig] || statusConfig.under_review;
  const StatusIcon = status.icon;
  return (
    <Card className={`w-full max-w-2xl p-8 bg-gradient-to-br from-card to-card/50 ${status.border} backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-500`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${status.bg} border ${status.border}`}>
            <StatusIcon className={`w-6 h-6 ${status.color}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verification Complete</h2>
            <p className="text-sm text-muted-foreground">Business wallet verified</p>
          </div>
        </div>
        <Badge 
          variant={verificationStatus === 'approved' ? 'default' : 'destructive'}
          className="text-sm px-3 py-1"
        >
          {verificationStatus.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-4 mb-6">
        <div className="p-4 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Business Name</p>
          </div>
          <p className="text-lg font-semibold text-foreground">{businessName}</p>
        </div>

        <div className="p-4 rounded-lg bg-background/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
          <p className="text-sm font-mono text-foreground break-all">{walletAddress}</p>
        </div>

        {failureReason && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive mb-1">Verification Failed</p>
                <p className="text-sm text-destructive/90">{failureReason}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`p-6 rounded-xl bg-gradient-to-br ${status.bg} border ${status.border}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-5 h-5 ${status.color}`} />
            <p className="text-sm text-muted-foreground">Total Transactions</p>
          </div>
          <p className={`text-4xl font-bold ${status.color}`}>{totalTransactions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Required: 100+</p>
        </div>

        <div className={`p-6 rounded-xl bg-gradient-to-br ${status.bg} border ${status.border}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-5 h-5 ${status.color}`} />
            <p className="text-sm text-muted-foreground">Credited (Incoming)</p>
          </div>
          <p className={`text-4xl font-bold ${status.color}`}>{(creditedTransactions ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Required: 50+</p>
        </div>

        <div className={`p-6 rounded-xl bg-gradient-to-br ${status.bg} border ${status.border}`}>
          <div className="flex items-center gap-2 mb-2">
            <Network className={`w-5 h-5 ${status.color}`} />
            <p className="text-sm text-muted-foreground">Unique Wallets</p>
          </div>
          <p className={`text-4xl font-bold ${status.color}`}>{uniqueWallets.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Required: 10+</p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Verification ID: {verificationId.substring(0, 8)}... • Verified: {new Date(verifiedAt).toLocaleString()}
      </div>
    </Card>
  );
};
