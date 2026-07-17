import { describe, it, expect } from "vitest";
import { generateTicketCode, generateUniqueCodes } from "../src/tickets/ticket-code.util";

/**
 * Tests générateur de codes tickets — mikconnect.
 *
 * Cas couverts :
 *  - format : MK-XXXX-XX (préfixe + 4 + 2 caractères)
 *  - alphabet : pas de caractères ambigus (0, O, I, 1, L)
 *  - unicité : generateUniqueCodes retourne des codes distincts
 *  - quantité : génère le bon nombre
 *  - entropie : assez de variété sur un échantillon
 */
describe("generateTicketCode", () => {
  it("produit un code de 8 caractères sans préfixe imposé", () => {
    const code = generateTicketCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(code).not.toContain("-");
  });

  it("n'utilise pas de caractères ambigus (0, O, I, 1, L)", () => {
    const ambiguous = "01OIL";
    for (let i = 0; i < 200; i++) {
      const code = generateTicketCode();
      const chars = code;
      for (const c of chars) {
        expect(ambiguous).not.toContain(c);
      }
    }
  });

  it.each([4, 5, 6, 7, 8] as const)("respecte une longueur totale de %i caractères", (length) => {
    expect(generateTicketCode(length)).toHaveLength(length);
  });
});

describe("generateUniqueCodes", () => {
  it("retourne le bon nombre de codes uniques", () => {
    const codes = generateUniqueCodes(50);
    expect(codes).toHaveLength(50);
    expect(new Set(codes).size).toBe(50);
  });

  it("génère un seul code si count=1", () => {
    const codes = generateUniqueCodes(1);
    expect(codes).toHaveLength(1);
  });

  it("produit des codes variés sur un grand échantillon", () => {
    const codes = generateUniqueCodes(500);
    const unique = new Set(codes);
    expect(unique.size).toBe(500);
  });
});
