import { prisma } from "../../lib/prisma.js";
import { normalizedQuery } from "./wine-search-text.js";

export async function rememberSearch(
  query: string,
  wineIds: string[]
): Promise<void> {
  const normalized = normalizedQuery(query);
  if (!normalized) {
    return;
  }
  await prisma.searchQuery.upsert({
    create: { normalized, wineIds },
    update: { searchedAt: new Date(), wineIds },
    where: { normalized },
  });
}

export async function recallSearch(query: string): Promise<string[] | null> {
  const normalized = normalizedQuery(query);
  if (!normalized) {
    return null;
  }
  const memo = await prisma.searchQuery.findUnique({ where: { normalized } });
  return memo?.wineIds ?? null;
}
