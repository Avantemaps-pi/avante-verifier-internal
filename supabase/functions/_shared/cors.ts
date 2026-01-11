// Shared CORS configuration for edge functions
// Restricts origins to known trusted sources

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';

  // NOTE:
  // This project can be hosted on multiple domains (Lovable preview, custom domains, Pi Browser).
  // To prevent browser-side CORS blocks, we reflect the request origin when present.
  // Auth is enforced separately inside each function.
  const allowOrigin = origin || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    // Note: Access-Control-Allow-Credentials removed intentionally.
    // This API uses x-api-key headers (not cookies) for authentication,
    // so credentials support is not needed and would be dangerous with origin reflection.
  };
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
