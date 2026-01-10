import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

// Pi Platform API endpoint for token verification
const PI_PLATFORM_API = 'https://api.minepi.com';

interface VerifyTokenRequest {
  accessToken: string;
}

interface PiUserInfo {
  uid: string;
  username: string;
  credentials?: {
    valid_until?: {
      timestamp: number;
      iso8601: string;
    };
  };
}

interface VerifyTokenResponse {
  success: boolean;
  user?: PiUserInfo;
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

    const body: VerifyTokenRequest = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the access token with Pi Platform API
    // The /v2/me endpoint returns user info if the token is valid
    const piResponse = await fetch(`${PI_PLATFORM_API}/v2/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!piResponse.ok) {
      const errorText = await piResponse.text();
      console.error('Pi API error:', piResponse.status, errorText);
      
      if (piResponse.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired access token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify token with Pi Platform' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData: PiUserInfo = await piResponse.json();

    // Check if credentials are still valid
    if (userData.credentials?.valid_until) {
      const validUntil = new Date(userData.credentials.valid_until.iso8601);
      if (validUntil < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access token has expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const response: VerifyTokenResponse = {
      success: true,
      user: {
        uid: userData.uid,
        username: userData.username,
        credentials: userData.credentials,
      },
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Token verification error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
