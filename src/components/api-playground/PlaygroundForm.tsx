import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { ThresholdInputs } from "./ThresholdInputs";
import type { PlaygroundFormData } from "./types";

interface PlaygroundFormProps {
  formData: PlaygroundFormData;
  onFormChange: (field: keyof PlaygroundFormData, value: string | boolean) => void;
  onSubmit: () => void;
  loading: boolean;
}

export const PlaygroundForm = ({
  formData,
  onFormChange,
  onSubmit,
  loading,
}: PlaygroundFormProps) => {
  const { apiKey, walletAddress, businessName, externalUserId, forceRefresh, minTransactions, minUniqueWallets, minCreditedTransactions } = formData;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-foreground">
            API Key <span className="text-destructive">*</span>
          </Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => onFormChange("apiKey", e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="walletAddress" className="text-foreground">
              Wallet Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="walletAddress"
              placeholder="GXXXXXXX..."
              value={walletAddress}
              onChange={(e) => onFormChange("walletAddress", e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-foreground">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              placeholder="My Business"
              value={businessName}
              onChange={(e) => onFormChange("businessName", e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="externalUserId" className="text-foreground">
              External User ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="externalUserId"
              placeholder="user_123"
              value={externalUserId}
              onChange={(e) => onFormChange("externalUserId", e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Options</Label>
            <div className="flex items-center gap-2 h-10">
              <Switch
                id="forceRefresh"
                checked={forceRefresh}
                onCheckedChange={(checked) => onFormChange("forceRefresh", checked)}
              />
              <Label htmlFor="forceRefresh" className="text-sm text-muted-foreground cursor-pointer">
                Force refresh (bypass cache)
              </Label>
            </div>
          </div>
        </div>

        <ThresholdInputs
          minTransactions={minTransactions}
          minCreditedTransactions={minCreditedTransactions}
          minUniqueWallets={minUniqueWallets}
          onMinTransactionsChange={(value) => onFormChange("minTransactions", value)}
          onMinCreditedTransactionsChange={(value) => onFormChange("minCreditedTransactions", value)}
          onMinUniqueWalletsChange={(value) => onFormChange("minUniqueWallets", value)}
        />
      </div>

      <Button
        onClick={onSubmit}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending Request...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Send Request
          </>
        )}
      </Button>
    </div>
  );
};
