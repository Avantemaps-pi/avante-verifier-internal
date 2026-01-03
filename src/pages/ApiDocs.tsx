import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, ExternalLink, Code, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const CodeBlock = ({ code, language = "json" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-muted-foreground">{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

const Section = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
      <span className="w-1 h-6 bg-primary rounded-full" />
      {title}
    </h2>
    {children}
  </section>
);

const ApiDocs = () => {
  const baseUrl = "https://cknlxuespsymlvtwkeqh.supabase.co/functions/v1/verify-business";
  const batchUrl = "https://cknlxuespsymlvtwkeqh.supabase.co/functions/v1/verify-business-batch";

  const basicExample = `curl -X POST "${baseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "businessName": "My Business",
    "externalUserId": "user_123"
  }'`;

  const forceRefreshExample = `curl -X POST "${baseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "businessName": "My Business",
    "externalUserId": "user_123",
    "forceRefresh": true
  }'`;

  const webhookExample = `curl -X POST "${baseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "businessName": "My Business",
    "externalUserId": "user_123",
    "webhookUrl": "https://your-server.com/webhook",
    "webhookSecret": "your_webhook_secret"
  }'`;

  const successResponse = `{
  "success": true,
  "cached": false,
  "cacheExpiresAt": "2025-01-02T15:30:00.000Z",
  "webhookQueued": true,
  "data": {
    "verificationId": "550e8400-e29b-41d4-a716-446655440000",
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "businessName": "My Business",
    "totalTransactions": 150,
    "uniqueWallets": 25,
    "meetsRequirements": true,
    "failureReason": null,
    "verificationStatus": "approved",
    "verifiedAt": "2025-01-02T14:30:00.000Z"
  }
}`;

  const webhookPayload = `{
  "event": "verification.completed",
  "timestamp": "2025-01-02T14:30:00.000Z",
  "data": {
    "verificationId": "550e8400-e29b-41d4-a716-446655440000",
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "businessName": "My Business",
    "externalUserId": "user_123",
    "totalTransactions": 150,
    "uniqueWallets": 25,
    "meetsRequirements": true,
    "failureReason": null,
    "verificationStatus": "approved",
    "verifiedAt": "2025-01-02T14:30:00.000Z"
  }
}`;

  const rateLimitResponse = `{
  "success": false,
  "error": "Rate limit exceeded. Try again after 2025-01-02T15:30:00.000Z"
}

// Response Headers:
// X-RateLimit-Limit: 5
// X-RateLimit-Remaining: 0
// X-RateLimit-Reset: 2025-01-02T15:30:00.000Z`;

  const batchRequest = `curl -X POST "${batchUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "verifications": [
      {
        "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "businessName": "Business One",
        "externalUserId": "user_001"
      },
      {
        "walletAddress": "GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
        "businessName": "Business Two",
        "externalUserId": "user_002"
      }
    ],
    "forceRefresh": false,
    "webhookUrl": "https://your-server.com/batch-webhook"
  }'`;

  const batchResponse = `{
  "success": true,
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "totalRequested": 2,
  "totalProcessed": 2,
  "totalSuccessful": 2,
  "totalFailed": 0,
  "webhookQueued": true,
  "results": [
    {
      "walletAddress": "GXXX...",
      "businessName": "Business One",
      "success": true,
      "cached": false,
      "data": {
        "verificationId": "...",
        "totalTransactions": 150,
        "uniqueWallets": 25,
        "meetsRequirements": true,
        "verificationStatus": "approved"
      }
    },
    {
      "walletAddress": "GYYY...",
      "businessName": "Business Two",
      "success": true,
      "cached": true,
      "data": { ... }
    }
  ]
}`;

  // JavaScript SDK Examples
  const jsInstallExample = `npm install axios
# or
yarn add axios`;

  const jsSingleVerifyExample = `import axios from 'axios';

const API_BASE_URL = '${baseUrl.replace('/verify-business', '')}';
const API_KEY = 'your-api-key';

async function verifyBusiness(walletAddress, businessName, externalUserId) {
  try {
    const response = await axios.post(
      \`\${API_BASE_URL}/verify-business\`,
      { walletAddress, businessName, externalUserId },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        }
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(\`Verification failed: \${error.response.data.error}\`);
    }
    throw error;
  }
}

// Usage
const result = await verifyBusiness(
  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'My Coffee Shop',
  'user_123'
);
console.log('Status:', result.data.verificationStatus);`;

  const jsBatchVerifyExample = `async function verifyBusinessBatch(verifications, options = {}) {
  const response = await axios.post(
    \`\${API_BASE_URL}/verify-business-batch\`,
    {
      verifications,
      forceRefresh: options.forceRefresh || false,
      webhookUrl: options.webhookUrl
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    }
  );
  return response.data;
}

// Usage
const results = await verifyBusinessBatch([
  { walletAddress: 'GXXX...', businessName: 'Shop A', externalUserId: 'user_1' },
  { walletAddress: 'GYYY...', businessName: 'Shop B', externalUserId: 'user_2' }
]);
console.log(\`Processed: \${results.totalSuccessful}/\${results.totalProcessed}\`);`;

  const jsWebhookHandlerExample = `import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'your-webhook-secret';

app.post('/webhook/verification', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  
  // Verify signature if secret is configured
  if (WEBHOOK_SECRET && signature) {
    const expectedSig = 'sha256=' + crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (signature !== expectedSig) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
  
  const { event, data } = req.body;
  console.log(\`Verification \${data.verificationStatus} for \${data.businessName}\`);
  
  res.status(200).json({ received: true });
});`;

  const jsClientClassExample = `class VerificationClient {
  constructor(apiKey, baseUrl = '${baseUrl.replace('/verify-business', '')}') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async verify(walletAddress, businessName, externalUserId, options = {}) {
    const response = await fetch(\`\${this.baseUrl}/verify-business\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({
        walletAddress, businessName, externalUserId,
        forceRefresh: options.forceRefresh,
        webhookUrl: options.webhookUrl
      })
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  }

  async verifyBatch(verifications, options = {}) {
    const response = await fetch(\`\${this.baseUrl}/verify-business-batch\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ verifications, ...options })
    });
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  }
}

// Usage
const client = new VerificationClient('your-api-key');
const result = await client.verify('GXXX...', 'My Shop', 'user_123');`;

  // Python SDK Examples
  const pyInstallExample = `pip install requests`;

  const pySingleVerifyExample = `import requests

API_BASE_URL = "${baseUrl.replace('/verify-business', '')}"
API_KEY = "your-api-key"

def verify_business(wallet_address: str, business_name: str, external_user_id: str) -> dict:
    """Verify a single business wallet address."""
    response = requests.post(
        f"{API_BASE_URL}/verify-business",
        json={
            "walletAddress": wallet_address,
            "businessName": business_name,
            "externalUserId": external_user_id
        },
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY
        }
    )
    response.raise_for_status()
    return response.json()

# Usage
result = verify_business(
    "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "My Coffee Shop",
    "user_123"
)
print(f"Status: {result['data']['verificationStatus']}")`;

  const pyBatchVerifyExample = `from typing import List, Optional

def verify_business_batch(
    verifications: List[dict],
    force_refresh: bool = False,
    webhook_url: Optional[str] = None
) -> dict:
    """Verify multiple business wallet addresses."""
    payload = {
        "verifications": verifications,
        "forceRefresh": force_refresh
    }
    if webhook_url:
        payload["webhookUrl"] = webhook_url
    
    response = requests.post(
        f"{API_BASE_URL}/verify-business-batch",
        json=payload,
        headers={"Content-Type": "application/json", "x-api-key": API_KEY}
    )
    response.raise_for_status()
    return response.json()

# Usage
results = verify_business_batch([
    {"walletAddress": "GXXX...", "businessName": "Shop A", "externalUserId": "user_1"},
    {"walletAddress": "GYYY...", "businessName": "Shop B", "externalUserId": "user_2"}
])
print(f"Processed: {results['totalSuccessful']}/{results['totalProcessed']}")`;

  const pyWebhookHandlerExample = `from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = "your-webhook-secret"

@app.route("/webhook/verification", methods=["POST"])
def handle_webhook():
    signature = request.headers.get("X-Webhook-Signature", "")
    
    # Verify signature if secret is configured
    if WEBHOOK_SECRET and signature:
        expected = "sha256=" + hmac.new(
            WEBHOOK_SECRET.encode(),
            request.data,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return jsonify({"error": "Invalid signature"}), 401
    
    data = request.json
    print(f"Verification {data['data']['verificationStatus']} for {data['data']['businessName']}")
    
    return jsonify({"received": True}), 200`;

  const pyClientClassExample = `import requests
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class VerificationResult:
    success: bool
    data: Optional[Dict[str, Any]] = None
    cached: bool = False

class VerificationClient:
    """Client for the Business Verification API."""
    
    def __init__(self, api_key: str, base_url: str = "${baseUrl.replace('/verify-business', '')}"):
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "x-api-key": api_key
        })
        self.base_url = base_url
    
    def verify(self, wallet_address: str, business_name: str, 
               external_user_id: str, **options) -> VerificationResult:
        response = self.session.post(
            f"{self.base_url}/verify-business",
            json={
                "walletAddress": wallet_address,
                "businessName": business_name,
                "externalUserId": external_user_id,
                **options
            }
        )
        response.raise_for_status()
        result = response.json()
        return VerificationResult(
            success=result.get("success", False),
            data=result.get("data"),
            cached=result.get("cached", False)
        )
    
    def verify_batch(self, verifications: List[dict], **options) -> dict:
        response = self.session.post(
            f"{self.base_url}/verify-business-batch",
            json={"verifications": verifications, **options}
        )
        response.raise_for_status()
        return response.json()

# Usage
client = VerificationClient("your-api-key")
result = client.verify("GXXX...", "My Shop", "user_123")`;

  const tableOfContents = [
    { id: "overview", label: "Overview" },
    { id: "authentication", label: "Authentication" },
    { id: "request", label: "Single Verification" },
    { id: "batch", label: "Batch Verification" },
    { id: "sdk-examples", label: "SDK Examples" },
    { id: "response", label: "Response Format" },
    { id: "caching", label: "Caching" },
    { id: "rate-limiting", label: "Rate Limiting" },
    { id: "webhooks", label: "Webhooks" },
    { id: "errors", label: "Error Handling" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Verifier</span>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">API Documentation</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
            {tableOfContents.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block py-1.5 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Verification API
            </h1>
            <p className="text-lg text-muted-foreground">
              Complete reference for the Avante Business Verification API endpoint.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded font-mono">POST</span>
              <code className="text-muted-foreground bg-muted/50 px-3 py-1 rounded-md text-sm break-all">
                {baseUrl}
              </code>
            </div>
          </div>

          <Section title="Overview" id="overview">
            <div className="prose prose-invert max-w-none space-y-4">
              <p className="text-muted-foreground">
                The Verification API allows you to verify Pi Network wallet activity for businesses. 
                It checks if a wallet has at least <strong className="text-foreground">100 transactions</strong> and 
                <strong className="text-foreground"> 10 unique wallet interactions</strong>.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 not-prose">
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">100+</p>
                  <p className="text-sm text-muted-foreground">Minimum transactions</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">10+</p>
                  <p className="text-sm text-muted-foreground">Unique wallets</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">1 hour</p>
                  <p className="text-sm text-muted-foreground">Cache duration</p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Authentication" id="authentication">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                All requests must include an API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-sm">x-api-key</code> header.
              </p>
              <CodeBlock code={`curl -H "x-api-key: YOUR_API_KEY" ...`} />
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  <strong>Security:</strong> Never expose your API key in client-side code. Always make API calls from your server.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Request Format" id="request">
            <div className="space-y-6">
              <p className="text-muted-foreground">Send a POST request with a JSON body:</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Parameter</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Required</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">walletAddress</td>
                      <td className="py-3 px-4">string</td>
                      <td className="py-3 px-4"><span className="text-green-400">Yes</span></td>
                      <td className="py-3 px-4">Pi Network wallet address (Stellar format, starts with G)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">businessName</td>
                      <td className="py-3 px-4">string</td>
                      <td className="py-3 px-4"><span className="text-green-400">Yes</span></td>
                      <td className="py-3 px-4">Name of the business being verified</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">externalUserId</td>
                      <td className="py-3 px-4">string</td>
                      <td className="py-3 px-4"><span className="text-green-400">Yes</span></td>
                      <td className="py-3 px-4">Your system's user/business ID for reference</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">forceRefresh</td>
                      <td className="py-3 px-4">boolean</td>
                      <td className="py-3 px-4"><span className="text-muted-foreground">No</span></td>
                      <td className="py-3 px-4">Bypass cache and fetch fresh data (default: false)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">webhookUrl</td>
                      <td className="py-3 px-4">string</td>
                      <td className="py-3 px-4"><span className="text-muted-foreground">No</span></td>
                      <td className="py-3 px-4">URL to receive webhook notification when verification completes</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">webhookSecret</td>
                      <td className="py-3 px-4">string</td>
                      <td className="py-3 px-4"><span className="text-muted-foreground">No</span></td>
                      <td className="py-3 px-4">Secret for webhook signature verification (HMAC-SHA256)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Basic Example</p>
                <CodeBlock code={basicExample} language="bash" />
              </div>
            </div>
          </Section>

          <Section title="Batch Verification" id="batch">
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Process multiple wallet verifications in a single request. Maximum <strong className="text-foreground">10 wallets</strong> per batch.
              </p>

              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded font-mono">POST</span>
                <code className="text-muted-foreground bg-muted/50 px-3 py-1 rounded-md text-sm break-all">
                  {batchUrl}
                </code>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">10</p>
                  <p className="text-sm text-muted-foreground">Max batch size</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">3</p>
                  <p className="text-sm text-muted-foreground">Parallel processing</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">Per-wallet</p>
                  <p className="text-sm text-muted-foreground">Rate limiting</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Batch Request Example</p>
                <CodeBlock code={batchRequest} language="bash" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Batch Response</p>
                <CodeBlock code={batchResponse} />
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <strong>Note:</strong> Each wallet in the batch is subject to individual rate limiting (5 requests/hour). 
                  Failed verifications are included in the results array with an error message.
                </p>
              </div>
            </div>
          </Section>

          <Section title="SDK Examples" id="sdk-examples">
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Use these code examples to integrate the Verification API into your application.
              </p>

              <Tabs defaultValue="javascript" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="javascript" className="flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    JavaScript
                  </TabsTrigger>
                  <TabsTrigger value="python" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Python
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="javascript" className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Installation</p>
                    <CodeBlock code={jsInstallExample} language="bash" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Single Verification</p>
                    <CodeBlock code={jsSingleVerifyExample} language="javascript" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Batch Verification</p>
                    <CodeBlock code={jsBatchVerifyExample} language="javascript" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Webhook Handler (Express.js)</p>
                    <CodeBlock code={jsWebhookHandlerExample} language="javascript" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Full Client Class</p>
                    <CodeBlock code={jsClientClassExample} language="javascript" />
                  </div>
                </TabsContent>

                <TabsContent value="python" className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Installation</p>
                    <CodeBlock code={pyInstallExample} language="bash" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Single Verification</p>
                    <CodeBlock code={pySingleVerifyExample} language="python" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Batch Verification</p>
                    <CodeBlock code={pyBatchVerifyExample} language="python" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Webhook Handler (Flask)</p>
                    <CodeBlock code={pyWebhookHandlerExample} language="python" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Full Client Class</p>
                    <CodeBlock code={pyClientClassExample} language="python" />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Section>

          <Section title="Response Format" id="response">
            <div className="space-y-6">
              <p className="text-muted-foreground">Successful responses return verification data:</p>
              <CodeBlock code={successResponse} />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Field</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">verificationStatus</td>
                      <td className="py-3 px-4">
                        <span className="text-green-400">approved</span> | <span className="text-destructive">rejected</span> | <span className="text-yellow-400">under_review</span>
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">meetsRequirements</td>
                      <td className="py-3 px-4">Boolean indicating if wallet meets 100 tx / 10 unique wallet criteria</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">cached</td>
                      <td className="py-3 px-4">Whether result was served from cache</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono text-primary">webhookQueued</td>
                      <td className="py-3 px-4">Whether a webhook notification was queued</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section title="Caching" id="caching">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Results are cached for <strong className="text-foreground">1 hour</strong> per wallet address. 
                Cache status is indicated in response headers and body.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground">Response Headers</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><code className="text-primary">X-Cache</code>: HIT or MISS</li>
                    <li><code className="text-primary">X-Cache-Expires</code>: ISO timestamp</li>
                  </ul>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground">Force Refresh</p>
                  <p className="text-sm text-muted-foreground">
                    Set <code className="text-primary">forceRefresh: true</code> to bypass cache
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Force Refresh Example</p>
                <CodeBlock code={forceRefreshExample} language="bash" />
              </div>
            </div>
          </Section>

          <Section title="Rate Limiting" id="rate-limiting">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Requests are limited to <strong className="text-foreground">5 verifications per hour</strong> per wallet address.
              </p>

              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <p className="font-medium text-foreground">Rate Limit Headers</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code className="text-primary">X-RateLimit-Limit</code>: Maximum requests allowed</li>
                  <li><code className="text-primary">X-RateLimit-Remaining</code>: Requests remaining</li>
                  <li><code className="text-primary">X-RateLimit-Reset</code>: When the limit resets</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Rate Limit Exceeded (429)</p>
                <CodeBlock code={rateLimitResponse} />
              </div>
            </div>
          </Section>

          <Section title="Webhooks" id="webhooks">
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Receive notifications when verifications complete. Webhooks are delivered asynchronously 
                with automatic retries (3 attempts).
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Request with Webhook</p>
                <CodeBlock code={webhookExample} language="bash" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Webhook Payload</p>
                <CodeBlock code={webhookPayload} />
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <p className="font-medium text-foreground">Webhook Headers</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><code className="text-primary">X-Webhook-Event</code>: verification.completed</li>
                  <li><code className="text-primary">X-Webhook-Timestamp</code>: ISO timestamp</li>
                  <li><code className="text-primary">X-Webhook-Signature</code>: HMAC-SHA256 signature (if secret provided)</li>
                </ul>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <strong>Signature Verification:</strong> If you provide a <code className="bg-muted px-1 rounded">webhookSecret</code>, 
                  verify the signature by computing HMAC-SHA256 of the raw JSON payload using your secret 
                  and comparing it to the <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header 
                  (format: <code className="bg-muted px-1 rounded">sha256=...</code>).
                </p>
              </div>
            </div>
          </Section>

          <Section title="Error Handling" id="errors">
            <div className="space-y-4">
              <p className="text-muted-foreground">The API returns appropriate HTTP status codes:</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4"><span className="text-green-400 font-mono">200</span></td>
                      <td className="py-3 px-4">Success</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4"><span className="text-yellow-400 font-mono">400</span></td>
                      <td className="py-3 px-4">Bad Request - Missing or invalid parameters</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4"><span className="text-destructive font-mono">401</span></td>
                      <td className="py-3 px-4">Unauthorized - Invalid or missing API key</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4"><span className="text-destructive font-mono">429</span></td>
                      <td className="py-3 px-4">Rate limit exceeded</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4"><span className="text-destructive font-mono">500</span></td>
                      <td className="py-3 px-4">Server error</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4"><span className="text-destructive font-mono">503</span></td>
                      <td className="py-3 px-4">Pi Network API unavailable</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Contact the Avante Maps team for support.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApiDocs;
