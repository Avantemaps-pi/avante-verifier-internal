import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const PI_HORIZON_API = 'https://api.mainnet.minepi.com';

// Default thresholds (can be overridden by environment variables)
const DEFAULT_MIN_TRANSACTIONS = parseInt(Deno.env.get('MIN_TRANSACTIONS') || '100');
const DEFAULT_MIN_UNIQUE_WALLETS = parseInt(Deno.env.get('MIN_UNIQUE_WALLETS') || '10');

interface VerifyBusinessRequest {
  walletAddress: string;
  businessName: string;
  externalUserId: string;
  forceRefresh?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  minTransactions?: number;
  minUniqueWallets?: number;
}

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

interface VerifyBusinessResponse {
  success: boolean;
  cached?: boolean;
  cacheExpiresAt?: string;
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
  webhookQueued?: boolean;
}

interface WebhookPayload {
  event: 'verification.completed' | 'verification.failed';
  timestamp: string;
  data: {
    verificationId: string;
    walletAddress: string;
    businessName: string;
    externalUserId: string;
    totalTransactions: number;
    uniqueWallets: number;
    meetsRequirements: boolean;
    failureReason: string | null;
    verificationStatus: string;
    verifiedAt: string;
  };
}

// Send webhook notification (runs as background task)
async function sendWebhookNotification(
  webhookUrl: string,
  payload: WebhookPayload,
  webhookSecret?: string
): Promise<void> {
  const maxRetries = 3;
  const retryDelays = [0, 1000, 5000]; // immediate, 1s, 5s
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
      
      console.log(`Sending webhook notification (attempt ${attempt + 1}/${maxRetries}) to: ${webhookUrl}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Avante-Business-Verifier/1.0',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
      };
      
      // Add signature if secret provided
      if (webhookSecret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await crypto.subtle.sign(
          'HMAC',
          key,
          encoder.encode(JSON.stringify(payload))
        );
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        headers['X-Webhook-Signature'] = `sha256=${signatureHex}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`Webhook notification sent successfully (status: ${response.status})`);
        return;
      }
      
      console.warn(`Webhook response not OK: ${response.status} ${response.statusText}`);
      
      // Don't retry on client errors (4xx) except 429
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`Webhook failed with client error, not retrying`);
        return;
      }
    } catch (error) {
      console.error(`Webhook attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : error);
    }
  }
  
  console.error(`All webhook retry attempts exhausted for: ${webhookUrl}`);
}

// Validate webhook URL
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// Validate Pi Network wallet address (Stellar-compatible format)
function isValidPiWalletAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

// Fetch all payments for an account with pagination from Pi Network blockchain
async function fetchAccountPayments(walletAddress: string): Promise<{
  totalTransactions: number;
  uniqueWallets: Set<string>;
}> {
  const uniqueWallets = new Set<string>();
  let totalTransactions = 0;
  let cursor: string | undefined;
  const limit = 200;
  
  console.log(`Fetching payments from Pi Network for wallet: ${walletAddress}`);
  
  try {
    while (true) {
      const url = new URL(`${PI_HORIZON_API}/accounts/${walletAddress}/payments`);
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('order', 'desc');
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Account not found on Pi Network blockchain');
          return { totalTransactions: 0, uniqueWallets: new Set() };
        }
        throw new Error(`Pi Network API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const records = data._embedded?.records || [];
      
      console.log(`Fetched ${records.length} payment records`);
      
      if (records.length === 0) {
        break;
      }
      
      for (const payment of records) {
        if (['payment', 'path_payment', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(payment.type)) {
          totalTransactions++;
          
          const counterparty = payment.from === walletAddress ? payment.to : payment.from;
          if (counterparty && counterparty !== walletAddress) {
            uniqueWallets.add(counterparty);
          }
        }
      }
      
      cursor = records[records.length - 1]?.paging_token;
      
      if (totalTransactions >= 10000) {
        console.log('Reached transaction limit (10,000), stopping pagination');
        break;
      }
      
      if (records.length < limit) {
        break;
      }
    }
    
    console.log(`Total transactions found: ${totalTransactions}, Unique wallets: ${uniqueWallets.size}`);
    return { totalTransactions, uniqueWallets };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Pi Network API request timed out');
    }
    console.error('Error fetching payments from Pi Network:', error);
    throw error;
  }
}

// Verify wallet on Pi Network blockchain
async function verifyWalletOnPiNetwork(walletAddress: string): Promise<{
  totalTransactions: number;
  uniqueWallets: number;
}> {
  console.log(`Querying Pi Network blockchain for wallet: ${walletAddress}`);
  
  const { totalTransactions, uniqueWallets } = await fetchAccountPayments(walletAddress);
  
  return {
    totalTransactions,
    uniqueWallets: uniqueWallets.size,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Timing-safe comparison for secrets
    function timingSafeEqual(a: string, b: string): boolean {
      if (a.length !== b.length) return false;
      const encoder = new TextEncoder();
      const bufA = encoder.encode(a);
      const bufB = encoder.encode(b);
      
      let result = 0;
      for (let i = 0; i < bufA.length; i++) {
        result |= bufA[i] ^ bufB[i];
      }
      return result === 0;
    }

    // Authentication: Accept either API key (for external API access) or Supabase auth header (for internal frontend calls)
    const apiKey = req.headers.get('x-api-key');
    const validApiKey = Deno.env.get('PI_API_KEY');
    const authHeader = req.headers.get('authorization');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const apiKeyHeader = req.headers.get('apikey');
    
    // Check if this is an internal call (has valid Supabase auth header or apikey header) or external API call (has valid API key)
    // Use timing-safe comparison for API key to prevent timing attacks
    const isValidApiKey = apiKey && validApiKey && timingSafeEqual(apiKey, validApiKey);
    const isInternalCall = (authHeader && supabaseAnonKey && authHeader.includes(supabaseAnonKey)) || 
                           (apiKeyHeader && supabaseAnonKey && timingSafeEqual(apiKeyHeader, supabaseAnonKey));
    
    console.log('Auth check:', { 
      hasApiKey: !!apiKey, 
      isValidApiKey, 
      hasAuthHeader: !!authHeader, 
      hasApiKeyHeader: !!apiKeyHeader,
      isInternalCall 
    });
    
    if (!isValidApiKey && !isInternalCall) {
      console.error('Unauthorized: No valid API key or internal auth');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: Invalid or missing API key' 
        } as VerifyBusinessResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { 
      walletAddress, 
      businessName, 
      externalUserId, 
      forceRefresh = false, 
      webhookUrl, 
      webhookSecret,
      minTransactions,
      minUniqueWallets
    }: VerifyBusinessRequest = await req.json();
    
    // Use request-level overrides if provided, otherwise fall back to environment defaults
    const effectiveMinTransactions = minTransactions ?? DEFAULT_MIN_TRANSACTIONS;
    const effectiveMinUniqueWallets = minUniqueWallets ?? DEFAULT_MIN_UNIQUE_WALLETS;
    
    console.log('Received verification request:', { 
      walletAddress, 
      businessName, 
      externalUserId, 
      forceRefresh, 
      webhookUrl: webhookUrl ? '[provided]' : undefined,
      minTransactions: effectiveMinTransactions,
      minUniqueWallets: effectiveMinUniqueWallets
    });

    // Validate webhook URL if provided
    if (webhookUrl && !isValidWebhookUrl(webhookUrl)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid webhook URL: must be a valid HTTP/HTTPS URL' 
        } as VerifyBusinessResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check rate limit before processing (5 requests per hour per wallet)
    if (walletAddress && walletAddress.trim().length > 0) {
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', { 
          p_wallet_address: walletAddress.trim(),
          p_max_requests: 5,
          p_window_hours: 1
        });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      } else if (rateLimitData && rateLimitData.length > 0 && !rateLimitData[0].allowed) {
        const resetAt = new Date(rateLimitData[0].reset_at).toISOString();
        console.log(`Rate limit exceeded for wallet: ${walletAddress}, resets at: ${resetAt}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Rate limit exceeded. Maximum 5 verification requests per hour per wallet. Try again after ${resetAt}` 
          } as VerifyBusinessResponse),
          {
            status: 429,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': '5',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetAt
            },
          }
        );
      }
    }

    // Validate wallet address format
    if (!isValidPiWalletAddress(walletAddress.trim())) {
      console.error('Invalid Pi wallet address format');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid Pi Network wallet address format. Must be a valid Stellar-compatible address starting with G.' 
        } as VerifyBusinessResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!businessName || businessName.trim().length === 0) {
      console.error('Invalid business name');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Business name is required' 
        } as VerifyBusinessResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!externalUserId || externalUserId.trim().length === 0) {
      console.error('Invalid external user ID');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'External user ID is required' 
        } as VerifyBusinessResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for cached verification result (unless force refresh requested)
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('business_verifications')
        .select('*')
        .eq('wallet_address', walletAddress.trim())
        .maybeSingle();
      
      if (cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime();
        const cacheExpiresAt = new Date(new Date(cachedData.updated_at).getTime() + CACHE_DURATION_MS).toISOString();
        
        if (cacheAge < CACHE_DURATION_MS) {
          console.log(`Returning cached verification result for wallet: ${walletAddress} (age: ${Math.round(cacheAge / 1000)}s)`);
          return new Response(
            JSON.stringify({ 
              success: true,
              cached: true,
              cacheExpiresAt,
              data: {
                verificationId: cachedData.id,
                walletAddress: cachedData.wallet_address,
                businessName: cachedData.business_name,
                totalTransactions: cachedData.total_transactions,
                uniqueWallets: cachedData.unique_wallets,
                meetsRequirements: cachedData.meets_requirements,
                failureReason: cachedData.failure_reason,
                verificationStatus: cachedData.verification_status,
                verifiedAt: cachedData.updated_at,
              }
            } as VerifyBusinessResponse),
            {
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'X-Cache': 'HIT',
                'X-Cache-Expires': cacheExpiresAt
              },
            }
          );
        } else {
          console.log(`Cache expired for wallet: ${walletAddress}, fetching fresh data`);
        }
      }
    } else {
      console.log('Force refresh requested, bypassing cache');
    }

    // Query real Pi Network blockchain
    console.log('Querying Pi Network blockchain...');
    const { totalTransactions, uniqueWallets } = await verifyWalletOnPiNetwork(walletAddress.trim());
    
    console.log('Pi Network blockchain data:', { totalTransactions, uniqueWallets });

    // Business rules evaluation using effective thresholds
    const meetsRequirements = totalTransactions >= effectiveMinTransactions && uniqueWallets >= effectiveMinUniqueWallets;
    let failureReason: string | null = null;
    
    if (!meetsRequirements) {
      if (totalTransactions < effectiveMinTransactions && uniqueWallets < effectiveMinUniqueWallets) {
        failureReason = `Insufficient transactions (${totalTransactions}/${effectiveMinTransactions}) and unique wallets (${uniqueWallets}/${effectiveMinUniqueWallets})`;
      } else if (totalTransactions < effectiveMinTransactions) {
        failureReason = `Insufficient transactions (${totalTransactions}/${effectiveMinTransactions})`;
      } else {
        failureReason = `Insufficient unique wallets (${uniqueWallets}/${effectiveMinUniqueWallets})`;
      }
    }
    
    const verificationStatus = meetsRequirements ? 'approved' : 'rejected';

    // Upsert to database (update if exists, insert if not)
    const { data: dbData, error: dbError } = await supabase
      .from('business_verifications')
      .upsert({
        wallet_address: walletAddress.trim(),
        business_name: businessName.trim(),
        external_user_id: externalUserId.trim(),
        total_transactions: totalTransactions,
        unique_wallets: uniqueWallets,
        meets_requirements: meetsRequirements,
        failure_reason: failureReason,
        verification_status: verificationStatus,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'wallet_address'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to save verification data' 
        } as VerifyBusinessResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Verification saved successfully:', dbData);

    // Increment verification usage for the user's subscription
    const { error: usageError } = await supabase
      .rpc('increment_verification_usage', { p_external_user_id: externalUserId.trim() });
    
    if (usageError) {
      console.error('Failed to increment verification usage:', usageError);
      // Don't fail the request, just log the error
    } else {
      console.log('Verification usage incremented for user:', externalUserId);
    }

    const cacheExpiresAt = new Date(Date.now() + CACHE_DURATION_MS).toISOString();

    // Queue webhook notification as background task if URL provided
    let webhookQueued = false;
    if (webhookUrl) {
      const webhookPayload: WebhookPayload = {
        event: 'verification.completed',
        timestamp: new Date().toISOString(),
        data: {
          verificationId: dbData.id,
          walletAddress: dbData.wallet_address,
          businessName: dbData.business_name,
          externalUserId: dbData.external_user_id,
          totalTransactions: dbData.total_transactions,
          uniqueWallets: dbData.unique_wallets,
          meetsRequirements: dbData.meets_requirements,
          failureReason: dbData.failure_reason,
          verificationStatus: dbData.verification_status,
          verifiedAt: dbData.updated_at,
        },
      };
      
      // Use EdgeRuntime.waitUntil for background task
      (globalThis as any).EdgeRuntime?.waitUntil?.(sendWebhookNotification(webhookUrl, webhookPayload, webhookSecret)) 
        ?? sendWebhookNotification(webhookUrl, webhookPayload, webhookSecret);
      webhookQueued = true;
      console.log('Webhook notification queued for background delivery');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        cached: false,
        cacheExpiresAt,
        webhookQueued,
        data: {
          verificationId: dbData.id,
          walletAddress: dbData.wallet_address,
          businessName: dbData.business_name,
          totalTransactions: dbData.total_transactions,
          uniqueWallets: dbData.unique_wallets,
          meetsRequirements: dbData.meets_requirements,
          failureReason: dbData.failure_reason,
          verificationStatus: dbData.verification_status,
          verifiedAt: dbData.updated_at,
        }
      } as VerifyBusinessResponse),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Cache-Expires': cacheExpiresAt
        },
      }
    );

  } catch (error) {
    console.error('Error in verify-business function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      } as VerifyBusinessResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
