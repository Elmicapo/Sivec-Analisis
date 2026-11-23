import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(storedHash);
  const key = await deriveKey(password, match?.[1] ?? '00000000000000000000000000000000', 64) as Buffer;
  return Boolean(match && timingSafeEqual(key, Buffer.from(match[2], 'hex')));
}
