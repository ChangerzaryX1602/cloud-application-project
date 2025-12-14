import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/.well-known/:path*', '/oauth/:path*', '/oidc/:path*'],
};

export async function middleware(request: NextRequest) {
  const ZITADEL_API_URL = process.env.ZITADEL_API_URL;
  
  if (!ZITADEL_API_URL) {
    console.error('ZITADEL_API_URL is not set');
    return NextResponse.next();
  }

  // Add CORS headers
  const requestHeaders = new Headers(request.headers);
  
  // Get the public host from headers
  const publicHost = 
    request.headers.get('x-forwarded-host') || 
    request.headers.get('host') || 
    'localhost';
  
  requestHeaders.set('x-zitadel-public-host', publicHost);

  const responseHeaders = new Headers();
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Headers', '*');

  // Rewrite to Zitadel backend
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, ZITADEL_API_URL);

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
    headers: responseHeaders,
  });
}
