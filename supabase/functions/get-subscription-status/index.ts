import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface GetSubscriptionRequest {
  externalUserId: string;
}

interface SubscriptionResponse {
  success: boolean;
  data?: {
    allowed: boolean;
    remaining: number;
    tier: string;
    expires_at: string | null;
  };
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: GetSubscriptionRequest = await req.json();
    const { externalUserId } = body;

    if (!externalUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'External user ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate externalUserId format (UUID or session ID pattern)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sessionPattern = /^session_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidPattern.test(externalUserId) && !sessionPattern.test(externalUserId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid external user ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key to call the restricted RPC
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the RPC function with service_role privileges
    const { data, error } = await supabase.rpc('check_verification_allowance', {
      p_external_user_id: externalUserId
    });

    if (error) {
      console.error('RPC error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check subscription status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data?.[0] || { allowed: false, remaining: 0, tier: 'free', expires_at: null };

    const response: SubscriptionResponse = {
      success: true,
      data: {
        allowed: result.allowed,
        remaining: result.remaining,
        tier: result.tier,
        expires_at: result.expires_at
      }
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Subscription status error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
