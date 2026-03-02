/**
 * mTLS 토스 프로모션 API 클라이언트
 *
 * 비게임 프로모션 3단계 플로우를 구현한다:
 * 1. get-key: 프로모션 실행 키 발급 (유효기간 1시간)
 * 2. execute-promotion: 프로모션 실행 (포인트 지급 요청)
 * 3. execution-result: 실행 결과 확인 (폴링)
 *
 * 환경변수 (auth Edge Function과 공유):
 * - TOSS_MTLS_CERT: 클라이언트 인증서 (base64 PEM)
 * - TOSS_MTLS_KEY: 클라이언트 개인키 (base64 PEM)
 * - TOSS_API_BASE_URL: 토스 파트너 API 베이스 URL
 * - TOSS_APP_KEY: 앱 식별 키
 */

import { PromotionErrorCode } from './types.ts';
import type {
  TossGetKeyResponse,
  TossExecuteResponse,
  TossExecutionResultResponse,
} from './types.ts';

// --- 상수 ---

const API_PATHS = {
  getKey: '/api-partner/v1/apps-in-toss/promotion/execute-promotion/get-key',
  execute: '/api-partner/v1/apps-in-toss/promotion/execute-promotion',
  result: '/api-partner/v1/apps-in-toss/promotion/execution-result',
} as const;

const POLLING_MAX_ATTEMPTS = 5;
const POLLING_INTERVAL_MS = 2000;

// --- 환경변수 ---

function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(
      `${PromotionErrorCode.SERVER_CONFIG_ERROR}: Missing environment variable: ${key}`
    );
  }
  return value;
}

// --- base64 PEM 디코딩 ---

function decodePem(encoded: string): string {
  const binaryString = atob(encoded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// --- mTLS HTTP 클라이언트 ---

async function tossApiFetch(
  endpoint: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<Response> {
  const certEncoded = getRequiredEnv('TOSS_MTLS_CERT');
  const keyEncoded = getRequiredEnv('TOSS_MTLS_KEY');
  const baseUrl = Deno.env.get('TOSS_API_BASE_URL') ?? 'https://apps-in-toss-api.toss.im';
  const appKey = getRequiredEnv('TOSS_APP_KEY');

  const certPem = decodePem(certEncoded);
  const keyPem = decodePem(keyEncoded);

  const client = Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
  });

  try {
    return await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': appKey,
        ...headers,
      },
      body: JSON.stringify(body),
      // @ts-ignore Deno-specific fetch option
      client,
    });
  } finally {
    client.close();
  }
}

// --- 유틸: 토스 API 에러 추출 ---

function extractTossError(
  data: { resultType: string; error?: { errorCode: string; reason: string } },
  fallbackCode: string,
): { errorCode: string; reason: string } {
  if (data.error) {
    return { errorCode: data.error.errorCode, reason: data.error.reason };
  }
  return { errorCode: fallbackCode, reason: 'Unknown error' };
}

// --- Step 1: get-key ---

export interface GetKeyResult {
  key: string;
}

export async function getPromotionKey(
  promotionCode: string,
  userKey: string,
): Promise<GetKeyResult> {
  let response: Response;

  try {
    response = await tossApiFetch(
      API_PATHS.getKey,
      { promotionCode },
      { 'x-toss-user-key': userKey },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith(PromotionErrorCode.SERVER_CONFIG_ERROR)) {
      throw err;
    }
    throw new Error(`${PromotionErrorCode.NETWORK_ERROR}: get-key request failed: ${message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `${PromotionErrorCode.GET_KEY_FAILED}: HTTP ${response.status} - ${text}`
    );
  }

  const data = (await response.json()) as TossGetKeyResponse;

  if (data.resultType === 'FAIL') {
    const { errorCode, reason } = extractTossError(data, 'UNKNOWN');
    throw new Error(
      `${PromotionErrorCode.GET_KEY_FAILED}: [${errorCode}] ${reason}`
    );
  }

  return { key: data.success.key };
}

// --- Step 2: execute-promotion ---

export async function executePromotion(
  promotionCode: string,
  key: string,
  amount: number,
): Promise<void> {
  let response: Response;

  try {
    response = await tossApiFetch(API_PATHS.execute, {
      promotionCode,
      key,
      amount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith(PromotionErrorCode.SERVER_CONFIG_ERROR)) {
      throw err;
    }
    throw new Error(
      `${PromotionErrorCode.NETWORK_ERROR}: execute-promotion request failed: ${message}`
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `${PromotionErrorCode.EXECUTE_FAILED}: HTTP ${response.status} - ${text}`
    );
  }

  const data = (await response.json()) as TossExecuteResponse;

  if (data.resultType === 'FAIL') {
    const { errorCode, reason } = extractTossError(data, 'UNKNOWN');
    throw new Error(
      `${PromotionErrorCode.EXECUTE_FAILED}: [${errorCode}] ${reason}`
    );
  }
}

// --- Step 3: execution-result (polling) ---

export type ExecutionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export async function pollExecutionResult(
  promotionCode: string,
  key: string,
): Promise<ExecutionStatus> {
  for (let attempt = 0; attempt < POLLING_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    }

    let response: Response;

    try {
      response = await tossApiFetch(API_PATHS.result, {
        promotionCode,
        key,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.startsWith(PromotionErrorCode.SERVER_CONFIG_ERROR)) {
        throw err;
      }
      // 네트워크 에러는 재시도
      console.warn(`[promotion] execution-result attempt ${attempt + 1} failed: ${message}`);
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      console.warn(
        `[promotion] execution-result attempt ${attempt + 1} HTTP ${response.status}: ${text}`
      );
      continue;
    }

    const data = (await response.json()) as TossExecutionResultResponse;

    if (data.resultType === 'FAIL') {
      const { errorCode, reason } = extractTossError(data, 'UNKNOWN');
      throw new Error(
        `${PromotionErrorCode.EXECUTION_RESULT_FAILED}: [${errorCode}] ${reason}`
      );
    }

    const status = data.success;

    if (status === 'SUCCESS') return 'SUCCESS';
    if (status === 'FAILED') return 'FAILED';

    // PENDING -> 다음 폴링
    console.log(`[promotion] execution-result attempt ${attempt + 1}: PENDING`);
  }

  // 폴링 최대 횟수 초과
  throw new Error(
    `${PromotionErrorCode.POLLING_TIMEOUT}: execution-result still PENDING after ${POLLING_MAX_ATTEMPTS} attempts`
  );
}

// --- 통합 플로우 ---

export interface PromotionFlowResult {
  key: string;
  status: ExecutionStatus;
}

/**
 * 프로모션 3단계 플로우 실행
 *
 * 1. get-key: 프로모션 키 발급
 * 2. execute-promotion: 포인트 지급 실행
 * 3. execution-result: 결과 확인 (폴링)
 */
export async function executePromotionFlow(
  promotionCode: string,
  amount: number,
  userKey: string,
): Promise<PromotionFlowResult> {
  // Step 1: get-key
  const { key } = await getPromotionKey(promotionCode, userKey);

  // Step 2: execute-promotion
  await executePromotion(promotionCode, key, amount);

  // Step 3: poll execution-result
  const status = await pollExecutionResult(promotionCode, key);

  return { key, status };
}
