import { randomBytes } from "node:crypto";

/**
 * Générateur de codes tickets — mikconnect.
 *
 * Format : 4 à 8 caractères aléatoires, sans préfixe imposé.
 *  - Alphabet sans caractères ambigus (pas de 0/O, 1/I/L) — lisible sur
 *    ticket imprimé et saisi manuellement par un agent sur téléphone.
 *
 * Entropie : 30^6 ≈ 7.3·10^8 combinaisons. Avec 10k tickets/tenant on a
 * une probabilité de collision < 0.007 % par tirage ; on vérifie l'unicité
 * en DB à la génération (retry sur collision, rare).
 *
 * Sécurité : crypto.randomBytes (CSPRNG), pas Math.random — un code deviné
 * donne accès au WiFi, donc le code est un secret.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".split("");
const ALPHABET_LEN = ALPHABET.length; // 30

/** Encode n octets aléatoires en `len` caractères de l'alphabet. */
function randomCodeChars(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET_LEN];
  }
  return out;
}

/** Génère un code ticket lisible de 4 à 8 caractères. */
export type TicketCodeLength = 4 | 5 | 6 | 7 | 8;

export function generateTicketCode(length: TicketCodeLength = 8): string {
  return randomCodeChars(length);
}

/**
 * Génère `count` codes uniques. On génère en surgrandissant le set puis on
 * déduplique — collisions rares vu l'entropie, donc 1 passe suffit en
 * pratique. L'appellant vérifie aussi l'unicité vs DB.
 */
export function generateUniqueCodes(count: number, length: TicketCodeLength = 8): string[] {
  const codes = new Set<string>();
  // Sur-allocation pour absorber les collisions in-memory (très rares).
  const target = count;
  while (codes.size < target) {
    codes.add(generateTicketCode(length));
  }
  return [...codes];
}
