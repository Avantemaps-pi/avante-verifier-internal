import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { PlaygroundFormData } from "./types";

interface CurlCommandProps {
  baseUrl: string;
  formData: PlaygroundFormData;
}

export const generateCurlCommand = (baseUrl: string, formData: PlaygroundFormData): string => {
  const { apiKey, walletAddress, businessName, externalUserId, forceRefresh, minTransactions, minCreditedTransactions, minUniqueWallets } = formData;
  
  const minTx = parseInt(minTransactions);
  const minWallets = parseInt(minUniqueWallets);
  const minCredited = parseInt(minCreditedTransactions);
  
  let thresholdParams = "";
  if (!isNaN(minTx) && minTx !== 100) {
    thresholdParams += `,\n    "minTransactions": ${minTx}`;
  }
  if (!isNaN(minCredited) && minCredited !== 50) {
    thresholdParams += `,\n    "minCreditedTransactions": ${minCredited}`;
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

export const CurlCommand = ({ baseUrl, formData }: CurlCommandProps) => {
  const curlCommand = generateCurlCommand(baseUrl, formData);

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm">
          <code className="text-muted-foreground whitespace-pre-wrap break-all">
            {curlCommand}
          </code>
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Copy this command and run it in your terminal to test the API.
      </p>
    </div>
  );
};
