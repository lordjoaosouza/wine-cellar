import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendLoginCodeEmail } from "../../src/modules/auth/mailer.js";
import { app, bearer, loginAs, resetDb } from "./helpers.js";

vi.mock("../../src/modules/auth/mailer.js", () => ({
  sendLoginCodeEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockedSend = vi.mocked(sendLoginCodeEmail);
const SIX_DIGITS = /^\d{6}$/;

function lastSentCode(): string {
  const call = mockedSend.mock.calls.at(-1);
  if (!call) {
    throw new Error("No login email was sent");
  }
  return call[1];
}

describe("auth", () => {
  beforeEach(async () => {
    await resetDb();
    mockedSend.mockClear();
  });

  it("emails a 6-digit code on request-code", async () => {
    await request(app)
      .post("/auth/request-code")
      .send({ email: "joao@example.com" })
      .expect(200, { ok: true });

    expect(mockedSend).toHaveBeenCalledOnce();
    expect(mockedSend.mock.calls[0]?.[0]).toBe("joao@example.com");
    expect(lastSentCode()).toMatch(SIX_DIGITS);
  });

  it("rejects a malformed email", async () => {
    await request(app)
      .post("/auth/request-code")
      .send({ email: "not-an-email" })
      .expect(400);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("throttles a second code request within the cooldown", async () => {
    const send = () =>
      request(app).post("/auth/request-code").send({ email: "a@example.com" });

    await send().expect(200);
    await send().expect(400);
    expect(mockedSend).toHaveBeenCalledOnce();
  });

  it("completes the full flow: request → verify → authenticated call", async () => {
    await request(app)
      .post("/auth/request-code")
      .send({ email: "flow@example.com" })
      .expect(200);

    const res = await request(app)
      .post("/auth/verify-code")
      .send({ code: lastSentCode(), email: "flow@example.com" })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));

    const me = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe("flow@example.com");
  });

  it("rejects a wrong code", async () => {
    await request(app)
      .post("/auth/request-code")
      .send({ email: "wrong@example.com" })
      .expect(200);

    const wrong = lastSentCode() === "000000" ? "111111" : "000000";
    await request(app)
      .post("/auth/verify-code")
      .send({ code: wrong, email: "wrong@example.com" })
      .expect(400);
  });

  it("rejects a code for an unknown email without leaking that fact", async () => {
    await request(app)
      .post("/auth/verify-code")
      .send({ code: "123456", email: "ghost@example.com" })
      .expect(400, { error: "Invalid or expired code" });
  });

  it("does not accept the same code twice", async () => {
    await request(app)
      .post("/auth/request-code")
      .send({ email: "once@example.com" })
      .expect(200);
    const code = lastSentCode();
    const verify = () =>
      request(app)
        .post("/auth/verify-code")
        .send({ code, email: "once@example.com" });

    await verify().expect(200);
    await verify().expect(400);
  });

  it("rotates the refresh token and rejects reuse of the old one", async () => {
    const session = await loginAs("refresh@example.com");

    const refreshed = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    expect(refreshed.body.refreshToken).not.toBe(session.refreshToken);

    await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it("protects routes with a bearer token", async () => {
    await request(app).get("/users/me").expect(401);
    await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer garbage")
      .expect(401);

    const session = await loginAs("ok@example.com");
    await request(app).get("/users/me").set(bearer(session)).expect(200);
  });
});
