import { describe, expect, it } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/lib/jwt.js";

describe("access tokens", () => {
  it("round-trips the user id", () => {
    const token = signAccessToken("user_123");
    expect(verifyAccessToken(token).sub).toBe("user_123");
  });

  it("rejects a token signed with a different secret", () => {
    const token = signRefreshToken("user_123");
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it("rejects a garbage token", () => {
    expect(() => verifyAccessToken("not-a-jwt")).toThrow();
  });
});

describe("refresh tokens", () => {
  it("round-trips the user id", () => {
    const token = signRefreshToken("user_456");
    expect(verifyRefreshToken(token).sub).toBe("user_456");
  });

  it("mints a distinct token on every call, even within the same second", () => {
    expect(signRefreshToken("user_456")).not.toBe(signRefreshToken("user_456"));
  });
});
