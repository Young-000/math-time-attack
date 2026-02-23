/**
 * CORS 헤더 유틸리티
 *
 * Supabase Edge Function에서 클라이언트 요청의 CORS를 처리한다.
 */

const ALLOWED_ORIGINS = [
  'https://math-time-attack.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
];

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * CORS preflight 요청에 대한 응답 생성
 */
export function handleCorsPreflightRequest(): Response {
  return new Response('ok', { headers: corsHeaders });
}

/**
 * 요청의 Origin 헤더를 검증하고 적절한 CORS 헤더를 반환한다.
 * 프로덕션에서는 허용된 origin만 허용하도록 강화할 수 있다.
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';

  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
    };
  }

  return corsHeaders;
}
