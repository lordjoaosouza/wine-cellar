import { prepareStorePhotoForVision } from "../../lib/image-prep.js";
import { throwIfAborted } from "../../lib/job-queue.js";
import { logger } from "../../lib/logger.js";
import { chatJson } from "../../lib/ollama.js";
import { type DownloadedImage, downloadImage } from "../../lib/remote-image.js";
import { normalizedTextKey } from "./wine-normalize.js";
import { PHOTO_CHECK_PROMPT, PHOTO_CHECK_SCHEMA } from "./wine-prompts.js";

export interface PhotoCandidate {
  imageUrl: string;
  pageUrl: string | null;
}

export interface PhotoChoice {
  photo: DownloadedImage | null;
  wrongPages: string[];
}

export interface PhotoCheckOptions {
  maxChecks?: number | undefined;
  signal?: AbortSignal | undefined;
}

interface PhotoCheck {
  cleanShot: boolean;
  labelReads: string;
  showsWine: boolean;
}

const DEFAULT_MAX_PHOTO_CHECKS = 2;
const WORD_PATTERN = /[a-z0-9]+/g;

function wordsWithout(text: string, exclude: Set<string>): string {
  return [...new Set(normalizedTextKey(text).match(WORD_PATTERN) ?? [])]
    .filter((word) => !exclude.has(word))
    .sort()
    .join(" ");
}

export function labelNamesWine(
  labelReads: string,
  wine: { name: string; producer: string | null }
): boolean {
  const producerWords = new Set(
    normalizedTextKey(wine.producer ?? "").match(WORD_PATTERN) ?? []
  );
  const expected = wordsWithout(wine.name, producerWords);
  return (
    expected !== "" && wordsWithout(labelReads, producerWords) === expected
  );
}

async function checkPhoto(
  wine: { name: string; producer: string | null },
  image: DownloadedImage,
  signal: AbortSignal | undefined
): Promise<PhotoCheck | null> {
  try {
    const prepared = await prepareStorePhotoForVision(image.buffer);
    return await chatJson<PhotoCheck>({
      images: [prepared.toString("base64")],
      schema: PHOTO_CHECK_SCHEMA,
      signal,
      system: PHOTO_CHECK_PROMPT,
      user: `WINE: ${wine.name}${wine.producer ? ` by ${wine.producer}` : ""}`,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    logger.warn({ err: error }, "photo check failed");
    return null;
  }
}

export async function chooseStorePhoto(
  wine: { name: string; producer: string | null },
  candidates: PhotoCandidate[],
  options: PhotoCheckOptions = {}
): Promise<PhotoChoice> {
  const maxChecks = options.maxChecks ?? DEFAULT_MAX_PHOTO_CHECKS;
  const wrongPages: string[] = [];
  let fallback: DownloadedImage | null = null;
  let checks = 0;

  for (const candidate of candidates) {
    if (checks >= maxChecks) {
      break;
    }
    if (options.signal) {
      throwIfAborted(options.signal);
    }
    const image = await downloadImage(candidate.imageUrl, options.signal);
    if (!image) {
      continue;
    }
    checks += 1;
    const check = await checkPhoto(wine, image, options.signal);
    if (!check) {
      continue;
    }
    const showsWine = check.showsWine || labelNamesWine(check.labelReads, wine);
    if (!showsWine) {
      logger.info(
        {
          labelReads: check.labelReads,
          page: candidate.pageUrl,
          wine: wine.name,
        },
        "store photo shows a different wine"
      );
      if (candidate.pageUrl) {
        wrongPages.push(candidate.pageUrl);
      }
      continue;
    }
    if (check.cleanShot) {
      return { photo: image, wrongPages };
    }
    fallback ??= image;
  }
  return { photo: fallback, wrongPages };
}
