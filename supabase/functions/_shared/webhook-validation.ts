/**
 * Webhook Signature Validation Utility
 * 
 * Use this module to validate incoming webhook requests from trusted sources.
 * Supports HMAC-SHA256 signature validation with timing-safe comparison.
 */

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
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

/**
 * Generate HMAC-SHA256 signature for a payload
 */
export async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate incoming webhook signature
 * 
 * @param payload - The raw request body as a string
 * @param signature - The signature from the request header (e.g., "sha256=abc123...")
 * @param secret - The shared secret used for signing
 * @param options - Additional validation options
 * @returns ValidationResult with success status and error message if failed
 */
export interface WebhookValidationOptions {
  /** Maximum age of the webhook in milliseconds (default: 5 minutes) */
  maxAge?: number;
  /** Timestamp from the webhook header for replay protection */
  timestamp?: string;
  /** Expected signature prefix (default: "sha256=") */
  signaturePrefix?: string;
}

export interface WebhookValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
  options: WebhookValidationOptions = {}
): Promise<WebhookValidationResult> {
  const {
    maxAge = 5 * 60 * 1000, // 5 minutes default
    timestamp,
    signaturePrefix = 'sha256='
  } = options;

  // Check if signature is provided
  if (!signature) {
    return { valid: false, error: 'Missing webhook signature' };
  }

  // Check if secret is configured
  if (!secret) {
    return { valid: false, error: 'Webhook secret not configured' };
  }

  // Validate timestamp for replay protection
  if (timestamp) {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    
    if (isNaN(webhookTime)) {
      return { valid: false, error: 'Invalid webhook timestamp format' };
    }
    
    if (Math.abs(now - webhookTime) > maxAge) {
      return { valid: false, error: 'Webhook timestamp expired (possible replay attack)' };
    }
  }

  // Extract signature hash
  let signatureHash = signature;
  if (signature.startsWith(signaturePrefix)) {
    signatureHash = signature.slice(signaturePrefix.length);
  }

  // Generate expected signature
  const expectedSignature = await generateSignature(payload, secret);

  // Use timing-safe comparison
  if (!timingSafeEqual(signatureHash.toLowerCase(), expectedSignature.toLowerCase())) {
    return { valid: false, error: 'Invalid webhook signature' };
  }

  return { valid: true };
}

/**
 * Extract standard webhook headers from a request
 */
export interface WebhookHeaders {
  signature: string | null;
  timestamp: string | null;
  event: string | null;
  deliveryId: string | null;
}

export function extractWebhookHeaders(req: Request): WebhookHeaders {
  return {
    signature: req.headers.get('X-Webhook-Signature') || 
               req.headers.get('X-Hub-Signature-256') || // GitHub style
               req.headers.get('Stripe-Signature'), // Stripe style
    timestamp: req.headers.get('X-Webhook-Timestamp') ||
               req.headers.get('X-Request-Timestamp'),
    event: req.headers.get('X-Webhook-Event') ||
           req.headers.get('X-GitHub-Event'),
    deliveryId: req.headers.get('X-Webhook-Delivery') ||
                req.headers.get('X-GitHub-Delivery')
  };
}

/**
 * Middleware-style function to validate webhook requests
 * Returns a Response if validation fails, or null if validation succeeds
 */
export async function validateWebhookRequest(
  req: Request,
  secret: string,
  corsHeaders: Record<string, string> = {}
): Promise<{ valid: true; body: string } | { valid: false; response: Response }> {
  try {
    const body = await req.text();
    const headers = extractWebhookHeaders(req);
    
    const result = await validateWebhookSignature(
      body,
      headers.signature,
      secret,
      { timestamp: headers.timestamp || undefined }
    );

    if (!result.valid) {
      console.warn('Webhook validation failed:', result.error);
      return {
        valid: false,
        response: new Response(
          JSON.stringify({ success: false, error: result.error }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      };
    }

    return { valid: true, body };
  } catch (error) {
    console.error('Webhook validation error:', error);
    return {
      valid: false,
      response: new Response(
        JSON.stringify({ success: false, error: 'Failed to validate webhook' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    };
  }
}
