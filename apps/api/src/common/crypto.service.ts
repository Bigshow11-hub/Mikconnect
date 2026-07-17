import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * CryptoService — mikconnect.
 *
 * Chiffrement AES-256-GCM des credentials Mikrotik au repos.
 * Clé dérivée depuis MIKROTIK_ENCRYPTION_KEY via scrypt (donc l'utilisateur
 * peut fournir une clé courte en dev ; en prod, une clé 32-bytes hex via vault).
 *
 * Format stocké : `v1:<saltHex>:<ivHex>:<authTagHex>:<cipherHex>`
 *  - `v1` préfixe pour migration future d'algorithme.
 *  - salt + iv + authTag uniques par chiffrement.
 *  - GCM fournit confidentialité + intégrité (authTag) — si la valeur est
 *    altérée en DB, le déchiffrement échoue proprement.
 *
 * Déchiffrement à la volée en mémoire, jamais loggé.
 */
@Injectable()
export class CryptoService {
  private readonly keyLength = 32;
  private readonly ivLength = 12;
  private readonly saltLength = 16;
  private readonly algo = "aes-256-gcm";
  private readonly masterKey: Buffer;

  constructor(private readonly config: ConfigService) {
    const rawKey = this.config.getOrThrow<string>("MIKROTIK_ENCRYPTION_KEY");
    this.masterKey = Buffer.from(rawKey, "hex");
    if (this.masterKey.length !== this.keyLength) {
      throw new Error(
        `MIKROTIK_ENCRYPTION_KEY must be ${this.keyLength} bytes hex (${this.keyLength * 2} chars). Got ${this.masterKey.length} bytes.`,
      );
    }
  }

  encrypt(plaintext: string): string {
    const salt = randomBytes(this.saltLength);
    const key = scryptSync(this.masterKey, salt, this.keyLength);
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algo, key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [
      "v1",
      salt.toString("hex"),
      iv.toString("hex"),
      authTag.toString("hex"),
      enc.toString("hex"),
    ].join(":");
  }

  decrypt(payload: string): string {
    const parts = payload.split(":");
    if (parts.length !== 5 || parts[0] !== "v1") {
      throw new UnauthorizedException("Invalid encrypted payload format");
    }
    const saltHex = parts[1]!;
    const ivHex = parts[2]!;
    const authTagHex = parts[3]!;
    const cipherHex = parts[4]!;
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const enc = Buffer.from(cipherHex, "hex");

    const key = scryptSync(this.masterKey, salt, this.keyLength);
    const decipher = createDecipheriv(this.algo, key, iv);
    decipher.setAuthTag(authTag);
    try {
      const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
      return dec.toString("utf8");
    } catch {
      throw new UnauthorizedException("Failed to decrypt payload (tampered or wrong key)");
    }
  }
}
