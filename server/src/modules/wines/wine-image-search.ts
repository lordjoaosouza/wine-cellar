import type OpenAI from "openai";
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem,
} from "openai/resources/responses/responses";
import { logger } from "../../lib/logger.js";
import { createResponse, WINE_RESEARCH_MODEL } from "./openai-client.js";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const META_IMAGE_PATTERN =
  /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
const JSON_LD_PATTERN =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const IMG_TAG_PATTERN = /<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
const IMAGE_FILE_PATTERN = /\.(jpe?g|png|webp)(\?.*)?$/i;
const TRAILING_PUNCTUATION_PATTERN = /[).\],'"]+$/;
const NONE_PATTERN = /^none$/i;
const HTTPS_PATTERN = /^https?:\/\//i;
const FINAL_IMAGE_URL_PATTERN = /^FINAL_IMAGE_URL:\s*(\S+)\s*$/gim;
const IMAGE_URL_PATTERN =
  /https?:\/\/[^\s)\]]+\.(?:jpe?g|png|webp)(?:\?[^\s)\]]*)?/gi;

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function extractMetaImages(html: string): string[] {
  return [...html.matchAll(META_IMAGE_PATTERN)]
    .map(([, url]) => url)
    .filter((url): url is string => Boolean(url));
}

function extractJsonLdImages(html: string): string[] {
  const found: string[] = [];
  for (const [, json] of html.matchAll(JSON_LD_PATTERN)) {
    try {
      const parsed = JSON.parse(json ?? "") as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const { image } = item as { image?: unknown };
        if (typeof image === "string") {
          found.push(image);
        } else if (Array.isArray(image)) {
          found.push(
            ...image.filter(
              (entry): entry is string => typeof entry === "string"
            )
          );
        }
      }
    } catch {
      // ignore
    }
  }
  return found;
}

function extractImgTagImages(html: string): string[] {
  return [...html.matchAll(IMG_TAG_PATTERN)]
    .map(([, src]) => src)
    .filter(
      (src): src is string =>
        Boolean(src) && IMAGE_FILE_PATTERN.test(src as string)
    );
}

function resolveImageUrls(
  pageUrl: string,
  candidates: Iterable<string>
): string[] {
  const resolved: string[] = [];
  for (const candidate of new Set(candidates)) {
    try {
      resolved.push(new URL(candidate, pageUrl).toString());
    } catch {
      // ignore
    }
  }
  return resolved.slice(0, 25);
}

async function fetchPageImages(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: timeoutSignal(10_000),
    });
    if (!response.ok) {
      return [];
    }

    const html = (await response.text()).slice(0, 1_500_000);
    const candidates = [
      ...extractMetaImages(html),
      ...extractJsonLdImages(html),
      ...extractImgTagImages(html),
    ];
    return resolveImageUrls(url, candidates);
  } catch (error) {
    logger.warn({ err: error, url }, "fetchPageImages failed");
    return [];
  }
}

const FETCH_PAGE_IMAGES_TOOL = {
  description:
    "Fetches a specific web page (e.g. a product page you found via web search) and returns the real image URLs found in its HTML — this actually loads the page instead of relying on a search snippet. Use it on every promising product page before deciding an image is good, since a snippet alone rarely contains a usable direct image URL.",
  name: "fetch_page_images",
  parameters: {
    additionalProperties: false,
    properties: {
      url: {
        description: "The exact product page URL to fetch and inspect.",
        type: "string",
      },
    },
    required: ["url"],
    type: "object",
  },
  strict: true,
  type: "function" as const,
};

function normalizeCapturedUrl(raw: string): string | null {
  let captured = raw.replace(TRAILING_PUNCTUATION_PATTERN, "");
  if (NONE_PATTERN.test(captured)) {
    return null;
  }
  if (captured.startsWith("//")) {
    captured = `https:${captured}`;
  }
  if (!HTTPS_PATTERN.test(captured)) {
    return null;
  }
  if (!IMAGE_FILE_PATTERN.test(captured)) {
    return null;
  }
  return captured;
}

function extractImageUrl(text: string): string | null {
  const markerMatches = [...text.matchAll(FINAL_IMAGE_URL_PATTERN)];
  const lastMarker = markerMatches.at(-1)?.[1];
  if (lastMarker) {
    return normalizeCapturedUrl(lastMarker);
  }

  const urlMatches = [...text.matchAll(IMAGE_URL_PATTERN)];
  const lastUrl = urlMatches.at(-1)?.[0];
  return lastUrl ? normalizeCapturedUrl(lastUrl) : null;
}

async function verifyImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: timeoutSignal(8000),
    });
    if (!response.ok) {
      return false;
    }
    return (response.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

function isFetchPageImagesCall(
  item: ResponseOutputItem
): item is ResponseFunctionToolCall {
  return item.type === "function_call" && item.name === "fetch_page_images";
}

async function runFetchPageImagesCall(
  call: ResponseFunctionToolCall
): Promise<ResponseInputItem> {
  let url = "";
  try {
    url = (JSON.parse(call.arguments) as { url?: string }).url ?? "";
  } catch {
    // ignore
  }
  const images = url ? await fetchPageImages(url) : [];
  const shown = images.slice(0, 4);
  const output: ResponseInputItem.FunctionCallOutput["output"] = JSON.stringify(
    {
      images: shown,
      summary:
        shown.length > 0
          ? `Found ${images.length} candidate image URL(s) on this page. The first ${shown.length} are shown below — look at them before citing one, and check they actually show the bottle on a plain white/neutral background.`
          : "No images found on this page — try a different candidate page.",
    }
  );

  return {
    call_id: call.call_id,
    output,
    type: "function_call_output" as const,
  };
}

const MAX_TOOL_ROUNDS = 6;

export async function findWineImageUrl(
  client: OpenAI,
  wine: { name: string; producer: string | null; vintage: string | null }
): Promise<string | null> {
  const instructions =
    "You find real product photo URLs for wines. Use web_search to find promising product page URLs, then use fetch_page_images on every promising URL — this tool actually loads the page and shows you the real candidate images it found, not just their URLs, so look at what is shown to you before citing any of them; never guess an image URL from a search snippet alone. Check well-known retailer and database sites, not just the first hit: Wine-Searcher, Vivino, Total Wine, Wine.com, Decanter, the producer's own official site, and other major wine shops. If a page fails to fetch or returns no images, try another candidate page rather than giving up. Only cite an image you were actually shown by fetch_page_images and that you can see genuinely shows the whole BOTTLE — not a cropped-in label graphic — isolated on a plain white or neutral studio background, the clean catalog-photo style a retailer uses on its own product page. Reject any image you were shown that turns out to be a lifestyle scene, a shelf or table setting, held by hands, next to food, glasses or other bottles, cropped to just the label, or on a colored or textured background — a busy, on-location, or label-only photo is worse than finding none at all, so keep checking other candidates instead of settling for one. The URL must point directly at an actual image file (ending in .jpg, .jpeg, .png, or .webp), never a PDF or an HTML page. Briefly explain what you checked and found, then end your response with exactly one line, and nothing after it, in this exact format: FINAL_IMAGE_URL: <url-or-NONE>";
  const initialInput = `Find a direct image URL for a clean product photo of the full bottle of "${wine.name}"${wine.producer ? ` by ${wine.producer}` : ""}${wine.vintage ? `, vintage ${wine.vintage}` : ""} — the whole bottle, not just the label, on a plain white background, the way a retailer shoots it for its own product page.`;
  const tools = [{ type: "web_search" as const }, FETCH_PAGE_IMAGES_TOOL];

  try {
    let response = await createResponse(client, {
      input: initialInput,
      instructions,
      model: WINE_RESEARCH_MODEL,
      tools,
    });

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const functionCalls = response.output.filter(isFetchPageImagesCall);
      if (functionCalls.length === 0) {
        break;
      }

      // biome-ignore lint/performance/noAwaitInLoops: each round's request depends on the previous round's response id
      const toolOutputs = await Promise.all(
        functionCalls.map(runFetchPageImagesCall)
      );

      response = await createResponse(client, {
        input: toolOutputs,
        model: WINE_RESEARCH_MODEL,
        previous_response_id: response.id,
        tools,
      });
    }

    const text = response.output_text;
    if (!text) {
      return null;
    }

    const candidate = extractImageUrl(text);
    if (!candidate) {
      return null;
    }

    return (await verifyImageUrl(candidate)) ? candidate : null;
  } catch (error) {
    logger.warn({ err: error, wine }, "findWineImageUrl failed");
    return null;
  }
}
