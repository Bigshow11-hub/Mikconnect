import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";

/**
 * Tests push RADIUS (MikrotikConnectorService.pushTickets) — mikconnect.
 *
 * Mode mock : valide le flux de push sans routeur physique.
 *
 * Cas couverts :
 *  - push OK : N tickets → pushed=N, failed=0
 *  - push 0 ticket → ok, message « aucun ticket »
 *  - push échec : host 0.0.0.0 → failed=N (routeur hors ligne)
 *  - message FR correct (singulier/pluriel)
 */
function makeConfigMock(mock = "true") {
  return {
    getOrThrow: vi.fn(() => "00".repeat(32)),
    get: vi.fn((key: string) => (key === "MIKROTIK_MOCK" ? mock : undefined)),
  } as unknown as ConfigService;
}

describe("MikrotikConnectorService.pushTickets (mock mode)", () => {
  let connector: MikrotikConnectorService;

  beforeEach(() => {
    connector = new MikrotikConnectorService(makeConfigMock("true"));
  });

  it("pousse N tickets avec succès", async () => {
    const result = await connector.pushTickets(
      { host: "192.168.88.1", apiUser: "api", apiPassword: "secret" },
      [
        { code: "MK-AAAA-01", durationMinutes: 60 },
        { code: "MK-AAAA-02", durationMinutes: 60 },
        { code: "MK-AAAA-03", durationMinutes: 60 },
      ],
    );
    expect(result.ok).toBe(true);
    expect(result.pushed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.message).toContain("3 tickets poussés");
  });

  it("gère le singulier pour 1 ticket", async () => {
    const result = await connector.pushTickets(
      { host: "192.168.88.1", apiUser: "api", apiPassword: "secret" },
      [{ code: "MK-AAAA-01", durationMinutes: 60 }],
    );
    expect(result.ok).toBe(true);
    expect(result.pushed).toBe(1);
    expect(result.message).toContain("1 ticket poussé");
  });

  it("retourne ok si 0 ticket à pousser", async () => {
    const result = await connector.pushTickets(
      { host: "192.168.88.1", apiUser: "api", apiPassword: "secret" },
      [],
    );
    expect(result.ok).toBe(true);
    expect(result.pushed).toBe(0);
    expect(result.message).toContain("Aucun ticket");
  });

  it("échoue si le routeur est hors ligne (host 0.0.0.0)", async () => {
    const result = await connector.pushTickets(
      { host: "0.0.0.0", apiUser: "api", apiPassword: "secret" },
      [
        { code: "MK-AAAA-01", durationMinutes: 60 },
        { code: "MK-AAAA-02", durationMinutes: 60 },
      ],
    );
    expect(result.ok).toBe(false);
    expect(result.pushed).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.message).toContain("Routeur hors ligne");
  });
});
