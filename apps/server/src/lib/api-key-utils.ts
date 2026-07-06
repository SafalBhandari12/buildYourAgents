import { eq, and, or, isNull, gt } from 'drizzle-orm';
import { getDb } from '../db';
import { apiKeys } from '../db/api-key-schema';
import { users } from '../db/auth-schema';

const KEY_PREFIX = 'sabai_';
const KEY_BYTES = 32;

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

export async function generateApiKey(): Promise<{ rawKey: string; hash: string; prefix: string }> {
  const rawBytes = randomBytes(KEY_BYTES);
  const rawKey = KEY_PREFIX + bytesToHex(rawBytes);
  const hash = await sha256(rawKey);
  const prefix = rawKey.slice(0, 15);
  return { rawKey, hash, prefix };
}

export async function validateApiKey(
  db: D1Database,
  rawKey: string,
): Promise<typeof users.$inferSelect | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;

  const hash = await sha256(rawKey);
  const database = getDb(db);

  const result = await database
    .select({
      user: users,
      apiKeyId: apiKeys.id,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(
      and(
        eq(apiKeys.keyHash, hash),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
      ),
    )
    .get();

  if (!result) return null;

  await database
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, result.apiKeyId));

  return result.user;
}
