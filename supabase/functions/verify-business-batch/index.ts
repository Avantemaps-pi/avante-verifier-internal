import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const PI_HORIZON_API = 'https://api.mainnet.minepi.com';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const MAX_BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 3;

// Default thresholds (can be overridden by environment variables)
const DEFAULT_MIN_TRANSACTIONS = parseInt(Deno.env.get('MIN_TRANSACTIONS') || '100');
const DEFAULT_MIN_UNIQUE_WALLETS = parseInt(Deno.env.get('MIN_UNIQUE_WALLETS') || '10');

interface BatchVerificationRequest {
  verifications: {
    walletAddress: string;
    businessName: string;
    externalUserId: string;
  }[];
  forceRefresh?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  minTransactions?: number;
  minUniqueWallets?: number;
}

interface VerificationResult {
  walletAddress: string;
  businessName: string;
  success: boolean;
  cached?: boolean;
  data?: {
    verificationId: string;
    totalTransactions: number;
    uniqueWallets: number;
    meetsRequirements: boolean;
    failureReason: string | null;
    verificationStatus: string;
    verifiedAt: string;
  };
  error?: string;
}

interface BatchVerificationResponse {
  success: boolean;
  batchId: string;
  totalRequested: number;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  results: VerificationResult[];
  webhookQueued?: boolean;
  error?: string;
}

// Validate Pi Network wallet address
function isValidPiWalletAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
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

// Fetch payments for a wallet
async function fetchAccountPayments(walletAddress: string): Promise<{
  totalTransactions: number;
  uniqueWallets: Set<string>;
}> {
  const uniqueWallets = new Set<string>();
  let totalTransactions = 0;
  let cursor: string | undefined;
  const limit = 200;
  
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
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { totalTransactions: 0, uniqueWallets: new Set() };
        }
        throw new Error(`Pi Network API error: ${response.status}`);
      }
      
      const data = await response.json();
      const records = data._embedded?.records || [];
      
      if (records.length === 0) break;
      
      for (const payment of records) {
        if (['payment', 'path_payment', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(payment.type)) {
          totalTransactions++;
          const counterparty = payment.from === walletAddress ? payment.to : payment.from;
          if (counterparty && counterparty !== walletAddress) {
            uniqueWallets.add(counterparty);
          }
        }
      }
      
      const nextLink = data._links?.next?.href;
      if (!nextLink || records.length < limit) break;
      
      const nextUrl = new URL(nextLink);
      cursor = nextUrl.searchParams.get('cursor') || undefined;
      if (!cursor) break;
    }
    
    return { totalTransactions, uniqueWallets };
  } catch (error) {
    console.error(`Error fetching payments for ${walletAddress}:`, error);
    throw error;
  }
}

// Process a single verification
async function processVerification(
  supabase: any,
  wallet: { walletAddress: string; businessName: string; externalUserId: string },
  forceRefresh: boolean,
  minTransactions: number,
  minUniqueWallets: number
): Promise<VerificationResult> {
  const { walletAddress, businessName, externalUserId } = wallet;
  
  try {
    // Validate wallet address
    if (!isValidPiWalletAddress(walletAddress.trim())) {
      return {
        walletAddress,
        businessName,
        success: false,
        error: 'Invalid Pi Network wallet address format',
      };
    }
    
    // Check rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_wallet_address: walletAddress.trim(),
        p_max_requests: 5,
        p_window_hours: 1
      });
    
    if (rateLimitError || !rateLimitData?.[0]?.allowed) {
      return {
        walletAddress,
        businessName,
        success: false,
        error: `Rate limit exceeded for wallet ${walletAddress}`,
      };
    }
    
    // Check cache unless force refresh
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('business_verifications')
        .select('*')
        .eq('wallet_address', walletAddress.trim())
        .maybeSingle();
      
      if (cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime();
        
        if (cacheAge < CACHE_DURATION_MS) {
          return {
            walletAddress,
            businessName,
            success: true,
            cached: true,
            data: {
              verificationId: cachedData.id,
              totalTransactions: cachedData.total_transactions,
              uniqueWallets: cachedData.unique_wallets,
              meetsRequirements: cachedData.meets_requirements,
              failureReason: cachedData.failure_reason,
              verificationStatus: cachedData.verification_status,
              verifiedAt: cachedData.updated_at,
            },
          };
        }
      }
    }
    
    // Fetch from blockchain
    const { totalTransactions, uniqueWallets } = await fetchAccountPayments(walletAddress.trim());
    const uniqueWalletsCount = uniqueWallets.size;
    
    const meetsRequirements = totalTransactions >= minTransactions && uniqueWalletsCount >= minUniqueWallets;
    let failureReason: string | null = null;
    
    if (!meetsRequirements) {
      const reasons: string[] = [];
      if (totalTransactions < minTransactions) {
        reasons.push(`Only ${totalTransactions} transactions (requires ${minTransactions}+)`);
      }
      if (uniqueWalletsCount < minUniqueWallets) {
        reasons.push(`Only ${uniqueWalletsCount} unique wallets (requires ${minUniqueWallets}+)`);
      }
      failureReason = reasons.join('; ');
    }
    
    const verificationStatus = meetsRequirements ? 'approved' : 'rejected';
    
    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('business_verifications')
      .upsert({
        wallet_address: walletAddress.trim(),
        business_name: businessName.trim(),
        external_user_id: externalUserId.trim(),
        total_transactions: totalTransactions,
        unique_wallets: uniqueWalletsCount,
        meets_requirements: meetsRequirements,
        failure_reason: failureReason,
        verification_status: verificationStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' })
      .select()
      .single();
    
    if (dbError) {
      return {
        walletAddress,
        businessName,
        success: false,
        error: 'Failed to save verification data',
      };
    }
    
    return {
      walletAddress,
      businessName,
      success: true,
      cached: false,
      data: {
        verificationId: dbData.id,
        totalTransactions: dbData.total_transactions,
        uniqueWallets: dbData.unique_wallets,
        meetsRequirements: dbData.meets_requirements,
        failureReason: dbData.failure_reason,
        verificationStatus: dbData.verification_status,
        verifiedAt: dbData.updated_at,
      },
    };
  } catch (error) {
    return {
      walletAddress,
      businessName,
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// Process with concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const p = processor(item).then(result => {
      results.push(result);
    });
    executing.push(p);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(0, executing.findIndex(e => e === p) + 1);
    }
  }
  
  await Promise.all(executing);
  return results;
}

// Send webhook notification
async function sendWebhookNotification(
  webhookUrl: string,
  payload: any,
  webhookSecret?: string
): Promise<void> {
  const maxRetries = 3;
  const retryDelays = [0, 1000, 5000];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Avante-Business-Verifier/1.0',
        'X-Webhook-Event': 'batch.verification.completed',
        'X-Webhook-Timestamp': new Date().toISOString(),
      };
      
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
        console.log('Batch webhook sent successfully');
        return;
      }
      
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return;
      }
    } catch (error) {
      console.error(`Webhook attempt ${attempt + 1} failed:`, error);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    
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

    // Validate API key using timing-safe comparison
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('PI_API_KEY');
    
    if (!apiKey || !expectedApiKey || !timingSafeEqual(apiKey, expectedApiKey)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      verifications, 
      forceRefresh = false, 
      webhookUrl, 
      webhookSecret,
      minTransactions,
      minUniqueWallets
    }: BatchVerificationRequest = await req.json();
    
    // Use request-level overrides if provided, otherwise fall back to environment defaults
    const effectiveMinTransactions = minTransactions ?? DEFAULT_MIN_TRANSACTIONS;
    const effectiveMinUniqueWallets = minUniqueWallets ?? DEFAULT_MIN_UNIQUE_WALLETS;
    
    console.log(`Received batch verification request for ${verifications?.length || 0} wallets (thresholds: ${effectiveMinTransactions} tx, ${effectiveMinUniqueWallets} wallets)`);

    // Validate request
    if (!verifications || !Array.isArray(verifications) || verifications.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'verifications array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verifications.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: `Maximum batch size is ${MAX_BATCH_SIZE} verifications` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate webhook URL if provided
    if (webhookUrl && !isValidWebhookUrl(webhookUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each verification request
    for (const v of verifications) {
      if (!v.walletAddress || !v.businessName || !v.externalUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Each verification requires walletAddress, businessName, and externalUserId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const batchId = crypto.randomUUID();
    console.log(`Processing batch ${batchId} with ${verifications.length} verifications`);

    // Process verifications with concurrency limit
    const results = await processWithConcurrency(
      verifications,
      (v) => processVerification(supabase, v, forceRefresh, effectiveMinTransactions, effectiveMinUniqueWallets),
      CONCURRENCY_LIMIT
    );

    const totalSuccessful = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    console.log(`Batch ${batchId} completed: ${totalSuccessful} successful, ${totalFailed} failed`);

    // Queue webhook if provided
    let webhookQueued = false;
    if (webhookUrl) {
      const webhookPayload = {
        event: 'batch.verification.completed',
        timestamp: new Date().toISOString(),
        batchId,
        totalRequested: verifications.length,
        totalSuccessful,
        totalFailed,
        results,
      };
      
      (globalThis as any).EdgeRuntime?.waitUntil?.(sendWebhookNotification(webhookUrl, webhookPayload, webhookSecret))
        ?? sendWebhookNotification(webhookUrl, webhookPayload, webhookSecret);
      webhookQueued = true;
    }

    const response: BatchVerificationResponse = {
      success: true,
      batchId,
      totalRequested: verifications.length,
      totalProcessed: results.length,
      totalSuccessful,
      totalFailed,
      results,
      webhookQueued,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch verification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
