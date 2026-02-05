import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { PlaygroundForm } from "./PlaygroundForm";
import { CurlCommand } from "./CurlCommand";
import { PlaygroundResponse } from "./PlaygroundResponse";
import type { PlaygroundProps, VerificationResult, PlaygroundFormData } from "./types";

export const ApiPlayground = ({ baseUrl, batchUrl }: PlaygroundProps) => {
  const [formData, setFormData] = useState<PlaygroundFormData>({
    apiKey: "",
    walletAddress: "",
    businessName: "",
    externalUserId: "",
    forceRefresh: false,
    minTransactions: "100",
    minUniqueWallets: "10",
    minCreditedTransactions: "50",
  });
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<VerificationResult | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const handleFormChange = (field: keyof PlaygroundFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const { apiKey, walletAddress, businessName, externalUserId, forceRefresh, minTransactions, minUniqueWallets, minCreditedTransactions } = formData;

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
      const minCredited = parseInt(minCreditedTransactions);
      if (!isNaN(minTx) && minTx !== 100) {
        requestBody.minTransactions = minTx;
      }
      if (!isNaN(minWallets) && minWallets !== 10) {
        requestBody.minUniqueWallets = minWallets;
      }
      if (!isNaN(minCredited) && minCredited !== 50) {
        requestBody.minCreditedTransactions = minCredited;
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

        <TabsContent value="form">
          <PlaygroundForm
            formData={formData}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="curl">
          <CurlCommand baseUrl={baseUrl} formData={formData} />
        </TabsContent>
      </Tabs>

      <PlaygroundResponse
        response={response}
        responseTime={responseTime}
        loading={loading}
      />
    </div>
  );
};
