import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PlaygroundProps {
  baseUrl: string;
  batchUrl: string;
}

interface VerificationResult {
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

export const ApiPlayground = ({ baseUrl, batchUrl }: PlaygroundProps) => {
  const [apiKey, setApiKey] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [externalUserId, setExternalUserId] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [minTransactions, setMinTransactions] = useState("100");
  const [minUniqueWallets, setMinUniqueWallets] = useState("10");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<VerificationResult | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey || !walletAddress || !businessName || !externalUserId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setResponse(null);
    const startTime = Date.now();

    try {
      const requestBody: Record<string, unknown> = {
        walletAddress,
        businessName,
        externalUserId,
        forceRefresh,
      };
      
      // Only include thresholds if they differ from defaults
      const minTx = parseInt(minTransactions);
      const minWallets = parseInt(minUniqueWallets);
      if (!isNaN(minTx) && minTx !== 100) {
        requestBody.minTransactions = minTx;
      }
      if (!isNaN(minWallets) && minWallets !== 10) {
        requestBody.minUniqueWallets = minWallets;
      }
      
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      setResponseTime(Date.now() - startTime);
      setResponse(data);

      if (data.success) {
        toast.success("Verification completed successfully");
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (error) {
      setResponseTime(Date.now() - startTime);
      setResponse({
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      });
      toast.error("Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateCurlCommand = () => {
    const minTx = parseInt(minTransactions);
    const minWallets = parseInt(minUniqueWallets);
    const hasCustomThresholds = (!isNaN(minTx) && minTx !== 100) || (!isNaN(minWallets) && minWallets !== 10);
    
    let thresholdParams = "";
    if (!isNaN(minTx) && minTx !== 100) {
      thresholdParams += `,\n    "minTransactions": ${minTx}`;
    }
    if (!isNaN(minWallets) && minWallets !== 10) {
      thresholdParams += `,\n    "minUniqueWallets": ${minWallets}`;
    }
    
    return `curl -X POST "${baseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || "YOUR_API_KEY"}" \\
  -d '{
    "walletAddress": "${walletAddress || "GXXX..."}",
    "businessName": "${businessName || "My Business"}",
    "externalUserId": "${externalUserId || "user_123"}"${forceRefresh ? ',\n    "forceRefresh": true' : ""}${thresholdParams}
  }'`;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-primary/20 to-transparent border-b border-border p-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          API Playground
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Test the verification endpoint directly from this page
        </p>
      </div>

      <Tabs defaultValue="form" className="p-4">
        <TabsList className="mb-4">
          <TabsTrigger value="form">Request Builder</TabsTrigger>
          <TabsTrigger value="curl">cURL Command</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-4">
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
                onChange={(e) => setApiKey(e.target.value)}
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
                  onChange={(e) => setWalletAddress(e.target.value)}
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
                  onChange={(e) => setBusinessName(e.target.value)}
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
                  onChange={(e) => setExternalUserId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Options</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    id="forceRefresh"
                    checked={forceRefresh}
                    onCheckedChange={setForceRefresh}
                  />
                  <Label htmlFor="forceRefresh" className="text-sm text-muted-foreground cursor-pointer">
                    Force refresh (bypass cache)
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minTransactions" className="text-foreground">
                  Minimum Transactions
                </Label>
                <Input
                  id="minTransactions"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={minTransactions}
                  onChange={(e) => setMinTransactions(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Default: 100</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minUniqueWallets" className="text-foreground">
                  Minimum Unique Wallets
                </Label>
                <Input
                  id="minUniqueWallets"
                  type="number"
                  min="1"
                  placeholder="10"
                  value={minUniqueWallets}
                  onChange={(e) => setMinUniqueWallets(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Default: 10</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
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
        </TabsContent>

        <TabsContent value="curl" className="space-y-4">
          <div className="relative">
            <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm">
              <code className="text-muted-foreground whitespace-pre-wrap break-all">
                {generateCurlCommand()}
              </code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => {
                navigator.clipboard.writeText(generateCurlCommand());
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy this command and run it in your terminal to test the API.
          </p>
        </TabsContent>
      </Tabs>

      {/* Response Section */}
      {(response || loading) && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              Response
              {responseTime !== null && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({responseTime}ms)
                </span>
              )}
            </h4>
            {response && (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    response.success
                      ? "bg-green-500/20 text-green-400"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {response.success ? "SUCCESS" : "ERROR"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyResponse}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-muted/50 border border-border rounded-lg p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : response ? (
            <div className="relative">
              <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm max-h-96">
                <code className="text-muted-foreground">
                  {JSON.stringify(response, null, 2)}
                </code>
              </pre>
            </div>
          ) : null}

          {response && !response.success && response.error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{response.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
