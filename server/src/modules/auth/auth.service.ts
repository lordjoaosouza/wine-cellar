import { createHash, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import ms from "ms";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { sendLoginCodeEmail } from "./mailer.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const CODE_LENGTH = 6;

function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, "0");
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestLoginCode(email: string): Promise<void> {
  const user = await prisma.user.upsert({
    create: { email },
    update: {},
    where: { email },
  });

  const recentCode = await prisma.loginCode.findFirst({
    orderBy: { createdAt: "desc" },
    where: { consumedAt: null, userId: user.id },
  });

  if (
    recentCode &&
    Date.now() - recentCode.createdAt.getTime() < CODE_RESEND_COOLDOWN_MS
  ) {
    throw HttpError.badRequest(
      "A code was already sent. Please wait a moment before requesting another."
    );
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.loginCode.create({
    data: {
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      userId: user.id,
    },
  });

  await sendLoginCodeEmail(email, code);
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(userId: string): Promise<TokenPair> {
  const refreshToken = signRefreshToken(userId);
  const expiresAt = new Date(
    Date.now() + ms(env.JWT_REFRESH_TTL as ms.StringValue)
  );

  await prisma.refreshToken.create({
    data: {
      expiresAt,
      tokenHash: hashRefreshToken(refreshToken),
      userId,
    },
  });

  return { accessToken: signAccessToken(userId), refreshToken };
}

export async function verifyLoginCode(
  email: string,
  code: string
): Promise<TokenPair> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw HttpError.badRequest("Invalid or expired code");
  }

  const candidates = await prisma.loginCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    where: { consumedAt: null, expiresAt: { gt: new Date() }, userId: user.id },
  });

  for (const candidate of candidates) {
    // biome-ignore lint/performance/noAwaitInLoops: must short-circuit on the first match, not hash-compare every candidate
    if (await bcrypt.compare(code, candidate.codeHash)) {
      await prisma.loginCode.update({
        data: { consumedAt: new Date() },
        where: { id: candidate.id },
      });
      return issueTokenPair(user.id);
    }
  }

  throw HttpError.badRequest("Invalid or expired code");
}

export async function refreshTokenPair(
  refreshToken: string
): Promise<TokenPair> {
  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken).sub;
  } catch (error) {
    throw HttpError.unauthorized("Invalid or expired refresh token", error);
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw HttpError.unauthorized("Invalid or expired refresh token");
  }

  await prisma.refreshToken.update({
    data: { revokedAt: new Date() },
    where: { id: stored.id },
  });
  return issueTokenPair(userId);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.updateMany({
    data: { revokedAt: new Date() },
    where: { revokedAt: null, tokenHash },
  });
}
