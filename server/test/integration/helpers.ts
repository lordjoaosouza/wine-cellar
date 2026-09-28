import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

export const app = createApp();

const TEST_DATABASE_NAME = /\/[^/?]*_test(\?|$)/;

export async function resetDb(): Promise<void> {
  if (!TEST_DATABASE_NAME.test(process.env.DATABASE_URL ?? "")) {
    throw new Error(
      "Refusing to truncate: DATABASE_URL must point at a database whose name ends in _test"
    );
  }

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) {
    return;
  }
  const names = tables.map(({ tablename }) => `"${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export async function loginAs(email: string): Promise<Session> {
  const code = "123456";
  const user = await prisma.user.upsert({
    create: { email },
    update: {},
    where: { email },
  });
  await prisma.loginCode.create({
    data: {
      codeHash: await bcrypt.hash(code, 4),
      expiresAt: new Date(Date.now() + 60_000),
      userId: user.id,
    },
  });

  const res = await request(app)
    .post("/auth/verify-code")
    .send({ code, email })
    .expect(200);

  return { ...res.body, userId: user.id };
}

export function bearer(session: Session): { Authorization: string } {
  return { Authorization: `Bearer ${session.accessToken}` };
}

let wineCounter = 0;

export function createWine(name?: string) {
  wineCounter += 1;
  const wineName = name ?? `Test Wine ${wineCounter}`;
  return prisma.wine.create({
    data: {
      name: wineName,
      normalizedKey: `${wineName.toLowerCase()}-${wineCounter}`,
    },
  });
}
