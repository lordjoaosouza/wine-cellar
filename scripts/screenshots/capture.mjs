import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { writeFakeCameraFeed } from "./fake-camera.mjs";
import { API_URL, wishlist } from "./fixtures.mjs";
import { createMockApi } from "./mock-api.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const dist = process.env.WEB_DIST ?? path.join(root, ".expo-web-dist");
const outDir =
  process.env.SCREENSHOT_DIR ?? path.join(root, "docs/screenshots");
const PORT = 4173;
const RATING_BUTTON_PATTERN = /Edit tasting|Rate this wine/;
const CELLAR_BUTTON_PATTERN = /Add to my cellar|in my cellar/;

const IPHONE_17 = {
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  viewport: { height: 874, width: 402 },
};

const MIME = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const candidates = [
    path.join(dist, clean),
    path.join(dist, `${clean}.html`),
    path.join(dist, clean, "index.html"),
  ];
  const segments = clean.split("/").filter(Boolean);
  if (segments.length === 2) {
    candidates.push(path.join(dist, segments[0], "[id].html"));
  }
  candidates.push(path.join(dist, "index.html"));
  return candidates.find((file) => existsSync(file) && statSync(file).isFile());
}

function serveDist() {
  const server = createServer((request, response) => {
    const file = resolveFile(request.url ?? "/");
    if (!file) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function shoot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, type: "png" });
  console.log(`captured ${path.relative(root, file)}`);
}

async function newPage(browser, { loggedIn = true } = {}) {
  const context = await browser.newContext({
    ...IPHONE_17,
    colorScheme: "light",
    locale: "en-US",
    permissions: ["camera"],
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    ({ apiUrl, authenticated }) => {
      window.localStorage.clear();
      window.localStorage.setItem("wine-cellar:api-url", apiUrl);
      if (authenticated) {
        window.localStorage.setItem("wine-cellar.access-token", "demo-access");
        window.localStorage.setItem(
          "wine-cellar.refresh-token",
          "demo-refresh"
        );
      }
    },
    { apiUrl: API_URL, authenticated: loggedIn }
  );
  const state = { wishlist };
  await context.route(`${API_URL}/**`, createMockApi(state));
  const page = await context.newPage();
  return { context, page, state };
}

async function open(page, route) {
  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: "networkidle",
  });
  await settle(page, 1400);
}

async function captureLogin(browser) {
  const { context, page } = await newPage(browser, { loggedIn: false });
  await open(page, "/login");
  await page.getByPlaceholder("you@email.com").fill("joao@example.com");
  await settle(page, 300);
  await shoot(page, "01-login");
  await context.close();
}

async function captureHomeAndSearch(browser) {
  const { context, page } = await newPage(browser);
  await open(page, "/");
  await shoot(page, "02-home");

  await page
    .getByRole("button", { name: "Search by wine, winery, or region" })
    .first()
    .click();
  await settle(page, 800);
  const input = page.getByRole("textbox").first();
  await input.fill("catena");
  await input.press("Enter");
  await settle(page, 1200);
  await shoot(page, "03-search-results");

  await input.fill("Château Pétrus 2015");
  await input.press("Enter");
  await settle(page, 2600);
  await shoot(page, "04-search-researching");
  await context.close();
}

async function captureWine(browser) {
  const { context, page } = await newPage(browser);
  await open(page, "/wine/catena-malbec");
  await shoot(page, "05-wine-detail");

  await page
    .getByRole("button", { name: CELLAR_BUTTON_PATTERN })
    .first()
    .click();
  await settle(page, 700);
  await shoot(page, "06-cellar-quantity");
  await page.getByRole("button", { name: "Close quantity" }).click();
  await settle(page, 500);

  await page
    .getByRole("button", { name: RATING_BUTTON_PATTERN })
    .first()
    .click();
  await settle(page, 900);
  await shoot(page, "07-tasting-form");
  await context.close();
}

async function captureTabs(browser) {
  const { context, page } = await newPage(browser);
  await open(page, "/cellar");
  await shoot(page, "08-cellar");
  await open(page, "/wishlist");
  await shoot(page, "09-wishlist");
  await open(page, "/rated");
  await shoot(page, "10-rated");
  await context.close();
}

async function captureSettings(browser) {
  const { context, page } = await newPage(browser);
  await open(page, "/preferences");
  await shoot(page, "11-preferences");
  await open(page, "/ai-model");
  await shoot(page, "12-ai-model");
  await open(page, "/tuya-connect");
  await shoot(page, "13-tuya-sensor");
  await context.close();
}

async function captureLabelScan(browser) {
  const { context, page } = await newPage(browser);
  await open(page, "/");
  await page.getByRole("button", { name: "Scan a wine label" }).first().click();
  await settle(page, 2200);
  await shoot(page, "14-label-scan");
  await context.close();
}

async function main() {
  if (!existsSync(path.join(dist, "index.html"))) {
    throw new Error(
      `No web build at ${dist}. Run: npx expo export --platform web --output-dir .expo-web-dist`
    );
  }
  await mkdir(outDir, { recursive: true });
  const server = await serveDist();
  const cameraFeed = await writeFakeCameraFeed(
    path.join(tmpdir(), "wine-cellar-label.y4m")
  );
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${cameraFeed}`,
    ],
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  });
  try {
    await captureLogin(browser);
    await captureHomeAndSearch(browser);
    await captureWine(browser);
    await captureTabs(browser);
    await captureSettings(browser);
    await captureLabelScan(browser);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
