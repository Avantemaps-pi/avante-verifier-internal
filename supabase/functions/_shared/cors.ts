// Shared CORS configuration for edge functions
// Restricts origins to known trusted sources

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // Allowed origins - add your production domain here
  const allowedOrigins = [
    Deno.env.get('ALLOWED_ORIGIN'),
    Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.supabase.co'),
    'https://app.pi',
    'https://sandbox.minepi.com',
    // Allow local development
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ].filter(Boolean) as string[];
  
  // Check if origin is allowed
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
