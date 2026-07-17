import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";

import { MikrotikConnectorService } from "../src/routers/mikrotik-connector.service";

/**
 * Tests MikrotikConnectorService — mikconnect.
 *
 * Mode mock (défaut en dev) : valide la forme des entrées et simule un
 * routeur reachable. Aucune connexion réseau réelle.
 *
 * Cas couverts :
 *  - test OK : host IP + credentials valides → ok=true, message + detail
 *  - test OK : host DDNS + credentials valides → ok=true
 *  - test échec : user "fail" → ok=false, message FR
 *  - test échec : host "0.0.0.0" → ok=false, message FR
 *  - validation : host vide → BadRequestException
 *  - validation : host invalide → BadRequestException
 *  - validation : user vide → BadRequestException
 *  - validation : password vide → BadRequestException
 */
function makeConfigMock(mock = "true") {
  return {
    getOrThrow: vi.fn(() => "00".repeat(32)),
    get: vi.fn((key: string) => (key === "MIKROTIK_MOCK" ? mock : undefined)),
  } as unknown as ConfigService;
}

describe("MikrotikConnectorService (mock mode)", () => {
  let connector: MikrotikConnectorService;

  beforeEach(() => {
    connector = new MikrotikConnectorService(makeConfigMock("true"));
  });

  it("test OK sur host IP + credentials valides", async () => {
    const result = await connector.testConnection({
      host: "192.168.88.1",
      apiUser: "api",
      apiPassword: "secret",
    });
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Routeur accessible.");
    expect(result.detail).toBeTruthy();
  });

  it("test OK sur host DDNS", async () => {
    const result = await connector.testConnection({
      host: "mon-routeur.ddns.net",
      apiUser: "api",
      apiPassword: "secret",
    });
    expect(result.ok).toBe(true);
  });

  it("test échec si user = 'fail' (simulacre refus)", async () => {
    const result = await connector.testConnection({
      host: "192.168.88.1",
      apiUser: "fail",
      apiPassword: "secret",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Identifiants API refusés");
  });

  it("test échec si host = '0.0.0.0' (simulacre injoignable)", async () => {
    const result = await connector.testConnection({
      host: "0.0.0.0",
      apiUser: "api",
      apiPassword: "secret",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Hôte injoignable");
  });

  it("rejette un host vide", async () => {
    await expect(
      connector.testConnection({ host: "", apiUser: "api", apiPassword: "x" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette un host invalide (pas IP ni hostname)", async () => {
    await expect(
      connector.testConnection({ host: "not a host", apiUser: "api", apiPassword: "x" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette un user vide", async () => {
    await expect(
      connector.testConnection({ host: "192.168.88.1", apiUser: "  ", apiPassword: "x" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette un password vide", async () => {
    await expect(
      connector.testConnection({ host: "192.168.88.1", apiUser: "api", apiPassword: "" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("retourne les utilisateurs Hotspot actifs normalisés", async () => {
    const result = await connector.getActiveHotspotUsers({
      host: "192.168.88.1",
      apiUser: "api",
      apiPassword: "secret",
    });

    expect(result.ok).toBe(true);
    expect(result.users).toHaveLength(2);
    expect(result.users[0]).toMatchObject({
      server: "hotspot-principal",
      blocked: false,
      radius: false,
    });
    expect(result.users[0]?.bytesOut).toBeGreaterThan(0);
  });

  it("isole l'échec d'un routeur hors ligne pendant la lecture Hotspot", async () => {
    const result = await connector.getActiveHotspotUsers({
      host: "0.0.0.0",
      apiUser: "api",
      apiPassword: "secret",
    });

    expect(result.ok).toBe(false);
    expect(result.users).toEqual([]);
    expect(result.message).toContain("hors ligne");
  });

  it("déconnecte une session Hotspot", async () => {
    const result = await connector.disconnectHotspotUser({
      host: "192.168.88.1", apiUser: "api", apiPassword: "secret",
    }, "*01A");
    expect(result).toMatchObject({ ok: true });
    expect(result.message).toContain("déconnectée");
  });

  it("bloque un appareil Hotspot puis le déconnecte", async () => {
    const result = await connector.blockHotspotUser({
      host: "192.168.88.1", apiUser: "api", apiPassword: "secret",
    }, "*01A", "34:12:F9:8A:21:4C");
    expect(result).toMatchObject({ ok: true });
    expect(result.message).toContain("bloqué");
  });
});
