import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  aiStatus,
  cellar,
  PHOTO_KEYS,
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

const ASSETS = new URL("./assets/", import.meta.url);

const STORE_PHOTOS = new Map([
  [PHOTO_KEYS["terracas-noar-pinot-noir"], "terracas-noar-pinot-noir.jpg"],
  [PHOTO_KEYS["vinha-solo-nero-selvaggio"], "vinha-solo-nero-selvaggio.jpg"],
  [PHOTO_KEYS["miolo-sesmarias"], "miolo-sesmarias.jpg"],
]);

const OTHER_PHOTOS = new Map([
  [PHOTO_KEYS["miolo-sesmarias-tasting"], "miolo-sesmarias-tasting.jpg"],
]);

const WHITE = { alpha: 1, b: 255, g: 255, r: 255 };
const TRIM_THRESHOLD = 24;
const MARGIN_RATIO = 0.04;

async function trimmedStorePhoto(file) {
  const { data, info } = await sharp(new URL(file, ASSETS).pathname)
    .flatten({ background: WHITE })
    .trim({ background: WHITE, threshold: TRIM_THRESHOLD })
    .toBuffer({ resolveWithObject: true });
  const margin = Math.round(Math.max(info.width, info.height) * MARGIN_RATIO);
  return sharp(data)
    .extend({
      background: WHITE,
      bottom: margin,
      left: margin,
      right: margin,
      top: margin,
    })
    .jpeg({ mozjpeg: true, quality: 88 })
    .toBuffer();
}

const photoCache = new Map();

async function photo(key) {
  if (!photoCache.has(key)) {
    if (STORE_PHOTOS.has(key)) {
      photoCache.set(key, await trimmedStorePhoto(STORE_PHOTOS.get(key)));
    } else if (OTHER_PHOTOS.has(key)) {
      photoCache.set(
        key,
        await readFile(new URL(OTHER_PHOTOS.get(key), ASSETS))
      );
    } else {
      photoCache.set(key, null);
    }
  }
  return photoCache.get(key);
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
      const image = await photo(path.slice("/uploads/".length));
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
