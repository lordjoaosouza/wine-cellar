import { logger } from "../../lib/logger.js";
import { chatJson } from "../../lib/ollama.js";
import { type DownloadedImage, downloadImage } from "../../lib/remote-image.js";
import { normalizedTextKey } from "./wine-normalize.js";
import { PHOTO_CHECK_PROMPT, PHOTO_CHECK_SCHEMA } from "./wine-prompts.js";

export interface PhotoCandidate {
  imageUrl: string;
  /** The store page the photo came from, if any. */
  pageUrl: string | null;
}

export interface PhotoChoice {
  photo: DownloadedImage | null;
  /** Store pages whose photo shows a different wine — not this wine's listing. */
  wrongPages: string[];
}

interface PhotoCheck {
  cleanShot: boolean;
  labelReads: string;
  showsWine: boolean;
}

// Each check is a vision call (~10s on a laptop), so only the first two.
const MAX_PHOTO_CHECKS = 2;
const WORD_PATTERN = /[a-z0-9]+/g;

function wordsWithout(text: string, exclude: Set<string>): string {
  return [...new Set(normalizedTextKey(text).match(WORD_PATTERN) ?? [])]
    .filter((word) => !exclude.has(word))
    .sort()
    .join(" ");
}

/**
 * Whether the label text the model read names exactly this wine, ignoring
 * the producer's words and word order: "Catena Malbec" matches "CATENA
 * MALBEC", but "D.V. Catena Malbec-Malbec" doesn't. A deterministic check on
 * top of the model's own verdict, which can be swayed by badges on a photo.
 */
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
  image: DownloadedImage
): Promise<PhotoCheck | null> {
  try {
    return await chatJson<PhotoCheck>({
      images: [image.buffer.toString("base64")],
      schema: PHOTO_CHECK_SCHEMA,
      system: PHOTO_CHECK_PROMPT,
      user: `WINE: ${wine.name}${wine.producer ? ` by ${wine.producer}` : ""}`,
    });
  } catch (error) {
    // e.g. an image format the model can't decode — skip this candidate.
    logger.warn({ err: error }, "photo check failed");
    return null;
  }
}

/**
 * Picks the wine's photo from store product photos, best stores first: the
 * local vision model confirms each one shows this exact wine. The first clean
 * catalog shot wins; otherwise the first correct photo. Photos of a different
 * wine flag their store page as a wrong match.
 */
export async function chooseStorePhoto(
  wine: { name: string; producer: string | null },
  candidates: PhotoCandidate[]
): Promise<PhotoChoice> {
  const wrongPages: string[] = [];
  let fallback: DownloadedImage | null = null;
  let checks = 0;

  for (const candidate of candidates) {
    if (checks >= MAX_PHOTO_CHECKS) {
      break;
    }
    // biome-ignore lint/performance/noAwaitInLoops: stop at the first good photo
    const image = await downloadImage(candidate.imageUrl);
    if (!image) {
      continue;
    }
    checks += 1;
    const check = await checkPhoto(wine, image);
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
