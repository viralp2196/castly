import bcrypt from "bcryptjs";

export function hashPassword(password: string, rounds: number) {
  return bcrypt.hash(password, rounds);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummy: Promise<string> | null = null;

/** Compares against a throwaway hash so a missing account takes as long as a wrong password. */
export async function burnPasswordCheck(password: string, rounds: number) {
  dummy ??= bcrypt.hash("castly-timing-equaliser", rounds);
  await bcrypt.compare(password, await dummy);
}
