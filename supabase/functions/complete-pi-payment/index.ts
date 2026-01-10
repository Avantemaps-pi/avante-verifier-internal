import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

const PI_API_KEY = Deno.env.get('PI_API_KEY');
const PI_PLATFORM_API = 'https://api.minepi.com';

interface CompletePaymentRequest {
  paymentId: string;
  txid: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    if (!PI_API_KEY) {
      console.error('PI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CompletePaymentRequest = await req.json();
    const { paymentId, txid } = body;

    if (!paymentId || !txid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment ID and transaction ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Complete the payment with Pi Platform API
    const completeResponse = await fetch(`${PI_PLATFORM_API}/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid }),
    });

    if (!completeResponse.ok) {
      const errorText = await completeResponse.text();
      console.error('Pi completion error:', completeResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to complete payment' }),
        { status: completeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await completeResponse.json();
    console.log('Payment completed:', paymentData);

    return new Response(
      JSON.stringify({ success: true, payment: paymentData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment completion error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
