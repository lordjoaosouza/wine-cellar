import { createRequire } from "node:module";
import {
  aiStatus,
  cellar,
  profile,
  ratings,
  recentViews,
  researchJob,
  tuyaReading,
  tuyaStatus,
  wineById,
  wines,
} from "./fixtures.mjs";

const require = createRequire(
  new URL("../../server/package.json", import.meta.url)
);
const sharp = require("sharp");

const BOTTLES = {
  "00000000-0000-4000-8000-000000000001.jpg": {
    glass: "#2B0F1E",
    label: "#F5EEDC",
    subtitle: "MALBEC",
    text: "#5C1736",
    title: "CATENA",
  },
  "00000000-0000-4000-8000-000000000002.jpg": {
    glass: "#1D1216",
    label: "#F8F1E4",
    subtitle: "RESERVA",
    text: "#1A1216",
    title: "CRASTO",
  },
  "00000000-0000-4000-8000-000000000003.jpg": {
    glass: "#25101A",
    label: "#111111",
    subtitle: "DEL DIABLO",
    text: "#E8D4DE",
    title: "CASILLERO",
  },
  "00000000-0000-4000-8000-000000000004.jpg": {
    glass: "#2A1420",
    label: "#EFE3D2",
    subtitle: "SYRAH",
    text: "#3D1828",
    title: "MIOLO",
  },
};

function bottleSvg({ glass, label, text, title, subtitle }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1500" viewBox="0 0 600 1500">
  <rect width="600" height="1500" fill="#ffffff"/>
  <path d="M245 40 h110 v220 c0 60 70 110 70 200 v940 a55 55 0 0 1 -55 55 h-140 a55 55 0 0 1 -55 -55 v-940 c0 -90 70 -140 70 -200 z" fill="${glass}"/>
  <path d="M255 60 h20 v210 c0 70 -60 110 -60 200 v900 h-20 v-900 c0 -100 60 -140 60 -200 z" fill="#ffffff" opacity="0.14"/>
  <rect x="245" y="40" width="110" height="90" rx="10" fill="#7A2B54"/>
  <rect x="170" y="760" width="260" height="330" rx="10" fill="${label}"/>
  <rect x="186" y="776" width="228" height="298" rx="6" fill="none" stroke="${text}" stroke-width="3" opacity="0.5"/>
  <text x="300" y="880" text-anchor="middle" font-family="Georgia, serif" font-size="46" font-weight="700" fill="${text}">${title}</text>
  <text x="300" y="935" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="4" fill="${text}">${subtitle}</text>
  <line x1="220" y1="970" x2="380" y2="970" stroke="${text}" stroke-width="2" opacity="0.6"/>
  <text x="300" y="1020" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="${text}" opacity="0.8">750 ml · 13.5% vol</text>
</svg>`;
}

const bottleCache = new Map();

async function bottleImage(key) {
  const spec = BOTTLES[key];
  if (!spec) {
    return null;
  }
  if (!bottleCache.has(key)) {
    bottleCache.set(
      key,
      await sharp(Buffer.from(bottleSvg(spec)))
        .jpeg({ quality: 90 })
        .toBuffer()
    );
  }
  return bottleCache.get(key);
}

function json(route, body, status = 200) {
  return route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  });
}

const cancelledJob = {
  ...researchJob,
  progress: 0.46,
  stage: "Cancelled",
  status: "cancelled",
};

const exactRoutes = new Map([
  ["/auth/request-code", () => ({ ok: true })],
  [
    "/auth/verify-code",
    () => ({ accessToken: "demo-access", refreshToken: "demo-refresh" }),
  ],
  [
    "/auth/refresh",
    () => ({ accessToken: "demo-access", refreshToken: "demo-refresh" }),
  ],
  ["/auth/logout", () => ({ ok: true })],
  ["/users/me/tuya", () => tuyaStatus],
  ["/users/me", () => profile],
  ["/tuya/reading", () => tuyaReading],
  ["/tuya/test", () => tuyaReading],
  ["/cellar", () => cellar],
  ["/ratings", () => ratings],
  ["/ai/status", () => aiStatus],
  ["/ai/settings", () => aiStatus],
  [
    "/health",
    () => ({
      checks: { database: "ok", ollama: "ok", searxng: "ok" },
      status: "ok",
    }),
  ],
  [
    "/account/export",
    () => ({
      cellar: [],
      exportedAt: new Date().toISOString(),
      profile,
      ratings: [],
      recentViews: [],
      version: 1,
      wines: [],
      wishlist: [],
    }),
  ],
]);

function searchWines(url) {
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const results = wines.filter((wine) =>
    `${wine.name} ${wine.winery} ${wine.region}`.toLowerCase().includes(q)
  );
  return {
    results,
    source: results.length > 0 ? "catalog" : "none",
    total: results.length,
  };
}

function prefixedResponse({ method, path, state, url }) {
  if (path.startsWith("/cellar/")) {
    return { body: cellar };
  }
  if (path === "/wishlist" || path.startsWith("/wishlist/")) {
    return { body: method === "DELETE" ? [] : (state.wishlist ?? []) };
  }
  if (path.startsWith("/ratings/")) {
    const [, , wineId] = path.split("/");
    return { body: ratings.find((rating) => rating.wineId === wineId) ?? null };
  }
  if (path === "/recent-views") {
    return { body: method === "DELETE" ? { ok: true } : recentViews };
  }
  if (path.startsWith("/recent-views/")) {
    return { body: recentViews };
  }
  if (path === "/wines/search") {
    return { body: searchWines(url) };
  }
  if (path.startsWith("/wines/research/")) {
    return { body: method === "DELETE" ? cancelledJob : researchJob };
  }
  if (path.startsWith("/ai/pulls/")) {
    return { body: aiStatus.models[0].pull };
  }
  if (path.startsWith("/wines/")) {
    const [, , id] = path.split("/");
    const wine = wineById.get(id);
    return wine
      ? { body: wine }
      : { body: { error: "Wine not found" }, status: 404 };
  }
  return { body: { error: `No mock for ${method} ${path}` }, status: 404 };
}

const startedJobs = new Map([
  [
    "/wines/research",
    { ...researchJob, progress: 0.08, stage: "Searching the web" },
  ],
  [
    "/wines/identify-label",
    { ...researchJob, progress: 0.2, stage: "Reading the label" },
  ],
]);

export function createMockApi(state) {
  return async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname: path } = url;
    const method = request.method();

    if (path.startsWith("/uploads/")) {
      const image = await bottleImage(path.slice("/uploads/".length));
      return image
        ? route.fulfill({ body: image, contentType: "image/jpeg", status: 200 })
        : route.fulfill({ status: 404 });
    }
    if (exactRoutes.has(path)) {
      return json(route, exactRoutes.get(path)());
    }
    if (startedJobs.has(path)) {
      return json(route, startedJobs.get(path), 202);
    }
    const { body, status = 200 } = prefixedResponse({
      method,
      path,
      state,
      url,
    });
    return json(route, body, status);
  };
}
