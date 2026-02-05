export interface PlaygroundProps {
  baseUrl: string;
  batchUrl: string;
}

export interface VerificationResult {
  success: boolean;
  cached?: boolean;
  cacheExpiresAt?: string;
  webhookQueued?: boolean;
  data?: {
    verificationId: string;
    walletAddress: string;
    businessName: string;
    totalTransactions: number;
    uniqueWallets: number;
    meetsRequirements: boolean;
    failureReason: string | null;
    verificationStatus: string;
    verifiedAt: string;
  };
  error?: string;
}

export interface PlaygroundFormData {
  apiKey: string;
  walletAddress: string;
  businessName: string;
  externalUserId: string;
  forceRefresh: boolean;
  minTransactions: string;
  minUniqueWallets: string;
  minCreditedTransactions: string;
}
