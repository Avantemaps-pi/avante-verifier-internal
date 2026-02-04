import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Search, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SyntaxHighlighter } from "@/components/SyntaxHighlighter";
import { ApiPlayground } from "@/components/ApiPlayground";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";

const CodeBlock = ({ code, language = "json" }: { code: string; language?: string }) => {
  return <SyntaxHighlighter code={code} language={language} />;
};

const EndpointUrl = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Copied!", description: "URL copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded font-mono text-xs">POST</span>
      <code className="text-muted-foreground text-xs flex-1 truncate">{url}</code>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
};

const Section = ({ title, id, children, hidden }: { title: string; id: string; children: React.ReactNode; hidden?: boolean }) => {
  if (hidden) return null;
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-primary rounded-full" />
        {title}
      </h2>
      {children}
    </section>
  );
};

const ApiDocs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const baseUrl = `${supabaseUrl}/functions/v1/verify-business`;
  const batchUrl = `${supabaseUrl}/functions/v1/verify-business-batch`;

  // Searchable content mapping
  const searchableContent = useMemo(() => ({
    overview: ["overview", "verify", "wallet", "transactions", "unique wallets", "cache", "thresholds", "100", "10", "50", "credited", "incoming"],
    playground: ["playground", "test", "try", "api"],
    "api-key-setup": ["api key", "setup", "generate", "secret", "configure", "VERIFIER_API_KEY", "openssl", "avante maps", "secrets", "environment"],
    authentication: ["authentication", "auth", "api key", "x-api-key", "header"],
    single: ["single", "verification", "walletAddress", "businessName", "externalUserId", "forceRefresh", "minTransactions", "minCreditedTransactions", "minUniqueWallets", "stellar", "wallet", "credited", "incoming"],
    batch: ["batch", "multiple", "verifications", "10 wallets"],
    response: ["response", "format", "success", "cached", "data", "verificationId", "meetsRequirements", "verificationStatus", "approved"],
    errors: ["error", "400", "401", "429", "500", "invalid", "missing", "rate limit", "internal server"],
  }), []);

  const isVisible = (sectionId: string) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const content = searchableContent[sectionId as keyof typeof searchableContent] || [];
    return content.some(term => term.toLowerCase().includes(query)) || 
           sectionId.toLowerCase().includes(query);
  };

  const basicExample = `curl -X POST "${baseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "businessName": "My Business",
    "externalUserId": "user_123"
  }'`;

  const batchRequest = `curl -X POST "${batchUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "verifications": [
      {
        "walletAddress": "GXXX...",
        "businessName": "Business One",
        "externalUserId": "user_001"
      },
      {
        "walletAddress": "GYYY...",
        "businessName": "Business Two",
        "externalUserId": "user_002"
      }
    ],
    "forceRefresh": false
  }'`;

  const successResponse = `{
  "success": true,
  "cached": false,
  "cacheExpiresAt": "2025-01-02T15:30:00.000Z",
  "data": {
    "verificationId": "550e8400-e29b-41d4-a716-446655440000",
    "walletAddress": "GXXX...",
    "businessName": "My Business",
    "totalTransactions": 150,
    "uniqueWallets": 25,
    "meetsRequirements": true,
    "failureReason": null,
    "verificationStatus": "approved",
    "verifiedAt": "2025-01-02T14:30:00.000Z"
  }
}`;

  const errorResponse = `{
  "success": false,
  "error": "Invalid wallet address format"
}`;

  const apiKeyGeneration = `# Generate a secure 32-byte API key
openssl rand -base64 32

# Example output:
# K7xP2mN9qR4vL8wE3yH6jT1uC5oA0sF2bG9dI4kM7nQ=`;

  const avanteMapUsage = `// In Avante Maps: src/config/api.ts or similar
const VERIFICATION_API = {
  baseUrl: "${supabaseUrl}/functions/v1",
  apiKey: process.env.PI_VERIFIER_API_KEY // or your env variable
};

// Making a verification request
const response = await fetch(\`\${VERIFICATION_API.baseUrl}/verify-business\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': VERIFICATION_API.apiKey
  },
  body: JSON.stringify({
    walletAddress: 'GXXX...',
    businessName: 'My Business',
    externalUserId: 'user_123'
  })
});`;

  const tableOfContents = [
    { id: "overview", label: "Overview" },
    { id: "playground", label: "API Playground" },
    { id: "api-key-setup", label: "API Key Setup" },
    { id: "authentication", label: "Authentication" },
    { id: "single", label: "Single Verification" },
    { id: "batch", label: "Batch Verification" },
    { id: "response", label: "Response Format" },
    { id: "errors", label: "Error Codes" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">Internal API Reference</h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-48 shrink-0">
          <nav className="sticky top-24 space-y-1">
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-8 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
            {tableOfContents.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`block py-1.5 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors ${
                  !isVisible(item.id) ? "opacity-40" : ""
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">INTERNAL</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Verification API
            </h1>
            <p className="text-muted-foreground">
              Quick reference for the Avante Business Verification API.
            </p>
          </div>

          <Section title="Overview" id="overview" hidden={!isVisible("overview")}>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Verify Pi Network wallet activity for businesses. Default thresholds: <strong className="text-foreground">100 total transactions</strong> (at least <strong className="text-foreground">50 credited/incoming</strong>) and <strong className="text-foreground">10 unique wallets</strong>.
              </p>
              <div className="grid sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xl font-bold text-primary">100+</p>
                  <p className="text-xs text-muted-foreground">Total transactions</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xl font-bold text-green-400">50+</p>
                  <p className="text-xs text-muted-foreground">Credited (incoming)</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xl font-bold text-primary">10+</p>
                  <p className="text-xs text-muted-foreground">Unique wallets</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xl font-bold text-primary">1 hour</p>
                  <p className="text-xs text-muted-foreground">Cache TTL</p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="API Playground" id="playground" hidden={!isVisible("playground")}>
            <ApiPlayground baseUrl={baseUrl} batchUrl={batchUrl} />
          </Section>

          <Section title="API Key Setup" id="api-key-setup" hidden={!isVisible("api-key-setup")}>
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-400 text-sm font-medium mb-1">⚠️ Important</p>
                <p className="text-muted-foreground text-sm">
                  The API key must be identical in both projects. Keep it secure and never commit it to version control.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Step 1: Generate a Secure Key</h3>
                <p className="text-muted-foreground text-sm">
                  Use OpenSSL to generate a cryptographically secure API key:
                </p>
                <CodeBlock code={apiKeyGeneration} language="bash" />
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Step 2: Configure This Project</h3>
                <p className="text-muted-foreground text-sm">
                  Add the generated key as the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">VERIFIER_API_KEY</code> secret in Lovable Cloud:
                </p>
                <ol className="list-decimal list-inside text-muted-foreground text-sm space-y-2 ml-2">
                  <li>Open the Avante Business Verifier project in Lovable</li>
                  <li>Navigate to <strong className="text-foreground">Settings → Secrets</strong></li>
                  <li>Add or update the secret named <code className="bg-muted px-1.5 py-0.5 rounded text-xs">VERIFIER_API_KEY</code></li>
                  <li>Paste your generated key as the value</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Step 3: Configure Avante Maps</h3>
                <p className="text-muted-foreground text-sm">
                  Store the same API key in the Avante Maps project and use it when making requests:
                </p>
                <CodeBlock code={avanteMapUsage} language="typescript" />
                <p className="text-muted-foreground text-sm">
                  Store the API key as an environment variable (e.g., <code className="bg-muted px-1.5 py-0.5 rounded text-xs">PI_VERIFIER_API_KEY</code>) in Avante Maps' secrets or environment configuration.
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <p className="text-foreground font-medium text-sm">Quick Reference</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">This project:</strong> VERIFIER_API_KEY secret</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">Avante Maps:</strong> x-api-key header</span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Authentication" id="authentication" hidden={!isVisible("authentication")}>
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Include your API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-sm">x-api-key</code> header.
              </p>
              <CodeBlock code={`-H "x-api-key: YOUR_API_KEY"`} language="bash" />
            </div>
          </Section>

          <Section title="Single Verification" id="single" hidden={!isVisible("single")}>
            <div className="space-y-4">
              <EndpointUrl url={baseUrl} />
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-foreground">Parameter</th>
                      <th className="text-left py-2 px-3 font-medium text-foreground">Required</th>
                      <th className="text-left py-2 px-3 font-medium text-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground text-sm">
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-primary text-xs">walletAddress</td>
                      <td className="py-2 px-3"><span className="text-green-400">Yes</span></td>
                      <td className="py-2 px-3">Stellar wallet address (starts with G)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-primary text-xs">businessName</td>
                      <td className="py-2 px-3"><span className="text-green-400">Yes</span></td>
                      <td className="py-2 px-3">Business name</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-primary text-xs">externalUserId</td>
                      <td className="py-2 px-3"><span className="text-green-400">Yes</span></td>
                      <td className="py-2 px-3">Your system's user ID</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-primary text-xs">forceRefresh</td>
                      <td className="py-2 px-3">No</td>
                      <td className="py-2 px-3">Bypass cache (default: false)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-primary text-xs">minTransactions</td>
                      <td className="py-2 px-3">No</td>
                      <td className="py-2 px-3">Min total transactions (default: 100)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-green-400 text-xs">minCreditedTransactions</td>
                      <td className="py-2 px-3">No</td>
                      <td className="py-2 px-3">Min credited/incoming transactions (default: 50)</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-primary text-xs">minUniqueWallets</td>
                      <td className="py-2 px-3">No</td>
                      <td className="py-2 px-3">Min unique wallets (default: 10)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <CodeBlock code={basicExample} language="bash" />
            </div>
          </Section>

          <Section title="Batch Verification" id="batch" hidden={!isVisible("batch")}>
            <div className="space-y-4">
              <EndpointUrl url={batchUrl} />
              <p className="text-muted-foreground text-sm">
                Verify up to 10 wallets in a single request.
              </p>
              <CodeBlock code={batchRequest} language="bash" />
            </div>
          </Section>

          <Section title="Response Format" id="response" hidden={!isVisible("response")}>
            <div className="space-y-4">
              <Tabs defaultValue="success" className="w-full">
                <TabsList>
                  <TabsTrigger value="success">Success</TabsTrigger>
                  <TabsTrigger value="error">Error</TabsTrigger>
                </TabsList>
                <TabsContent value="success" className="mt-3">
                  <CodeBlock code={successResponse} language="json" />
                </TabsContent>
                <TabsContent value="error" className="mt-3">
                  <CodeBlock code={errorResponse} language="json" />
                </TabsContent>
              </Tabs>
            </div>
          </Section>

          <Section title="Error Codes" id="errors" hidden={!isVisible("errors")}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-foreground">Code</th>
                    <th className="text-left py-2 px-3 font-medium text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-destructive">400</td>
                    <td className="py-2 px-3">Invalid request body or parameters</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-destructive">401</td>
                    <td className="py-2 px-3">Missing or invalid API key</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-destructive">429</td>
                    <td className="py-2 px-3">Rate limit exceeded</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-destructive">500</td>
                    <td className="py-2 px-3">Internal server error</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          {searchQuery && !Object.keys(searchableContent).some(id => isVisible(id)) && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No results found for "{searchQuery}"</p>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-2">
                Clear search
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ApiDocs;
