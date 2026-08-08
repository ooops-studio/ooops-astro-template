export type StageSignatureResult =
  | { ok: true; timestamp: string; signature: string }
  | { ok: false; status: number; message: string };

const encoder = new TextEncoder();
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
};

export const signStagePayload = async (secret: string, timestamp: string, body: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`));
  return toHex(signature);
};

export const verifyStageSignature = async ({
  secret,
  timestamp,
  signatureHeader,
  body,
  now = Date.now()
}: {
  secret: string;
  timestamp: string | null;
  signatureHeader: string | null;
  body: string;
  now?: number;
}): Promise<StageSignatureResult> => {
  if (!secret) return { ok: false, status: 500, message: 'Webhook secret is not configured.' };
  if (!timestamp || !signatureHeader) return { ok: false, status: 400, message: 'Missing Stage signature headers.' };

  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs)) return { ok: false, status: 400, message: 'Invalid Stage timestamp.' };
  if (Math.abs(now - timestampMs) > MAX_TIMESTAMP_SKEW_MS) {
    return { ok: false, status: 401, message: 'Stage signature timestamp is outside the allowed window.' };
  }

  const signature = signatureHeader.replace(/^v1=/, '').trim();
  const expected = await signStagePayload(secret, timestamp, body);
  if (!timingSafeEqual(signature, expected)) {
    return { ok: false, status: 401, message: 'Invalid Stage signature.' };
  }

  return { ok: true, timestamp, signature };
};

export const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers
    }
  });
