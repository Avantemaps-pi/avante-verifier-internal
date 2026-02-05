import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";
import type { VerificationResult } from "./types";

interface PlaygroundResponseProps {
  response: VerificationResult | null;
  responseTime: number | null;
  loading: boolean;
}

export const PlaygroundResponse = ({
  response,
  responseTime,
  loading,
}: PlaygroundResponseProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!response && !loading) {
    return null;
  }

  return (
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
  );
};
