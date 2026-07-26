import * as bcrypt from "bcryptjs";

// Coût volontairement borné pour rester utilisable sur les petits serveurs
// du pilote tout en conservant le seuil bcrypt recommandé pour un MVP.
export const PASSWORD_HASH_ROUNDS = 10;

export function passwordHashNeedsUpgrade(hash: string) {
  try {
    return bcrypt.getRounds(hash) > PASSWORD_HASH_ROUNDS;
  } catch {
    return false;
  }
}
