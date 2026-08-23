import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../../src/lib/crypto.js";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const encrypted = encryptSecret("sk-super-secret-key");
    expect(encrypted).not.toBe("sk-super-secret-key");
    expect(decryptSecret(encrypted)).toBe("sk-super-secret-key");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
  });

  it("rejects a tampered payload", () => {
    const encrypted = encryptSecret("sk-super-secret-key");
    const [iv, authTag, ciphertext] = encrypted.split(".");
    const bytes = Buffer.from(ciphertext ?? "", "base64");
    // biome-ignore lint/suspicious/noBitwiseOperators: flipping bits is the point of this tamper test
    bytes[0] = (bytes[0] ?? 0) ^ 0xff;
    const tampered = [iv, authTag, bytes.toString("base64")].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow();
  });
});
