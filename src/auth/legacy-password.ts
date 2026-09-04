import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2');
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (!isBcryptHash(hash)) return false;
  return bcrypt.compare(password, hash);
}
