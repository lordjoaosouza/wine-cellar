import { describe, expect, it } from "vitest";
import {
  absolutizeUploadUrls,
  toStoredUploadUrl,
} from "../../src/lib/upload-urls.js";

const PHOTO = "/uploads/3c2bbdbe-efe8-43c4-83bc-3dba5035e4f7.jpg";
const ORIGIN = "http://100.100.15.95:3000";

describe("upload URLs", () => {
  it("makes stored upload paths absolute for the calling client, anywhere in a payload", () => {
    expect(
      absolutizeUploadUrls(
        {
          results: [{ imageUrl: PHOTO, name: "Miolo", offers: [] }],
          wine: { imageUrl: "https://cdn.store.com.br/bottle.jpg" },
        },
        ORIGIN
      )
    ).toEqual({
      results: [{ imageUrl: `${ORIGIN}${PHOTO}`, name: "Miolo", offers: [] }],
      wine: { imageUrl: "https://cdn.store.com.br/bottle.jpg" },
    });
  });

  it("leaves text that merely mentions /uploads alone", () => {
    expect(absolutizeUploadUrls(`see ${PHOTO}`, ORIGIN)).toBe(`see ${PHOTO}`);
    expect(absolutizeUploadUrls("/uploads/../../etc/passwd", ORIGIN)).toBe(
      "/uploads/../../etc/passwd"
    );
    expect(absolutizeUploadUrls(null, ORIGIN)).toBeNull();
  });

  it("stores this server's absolute photo URLs as relative paths", () => {
    expect(toStoredUploadUrl(`http://localhost:3000${PHOTO}`)).toBe(PHOTO);
    expect(toStoredUploadUrl(`https://homelab.tailnet.ts.net${PHOTO}`)).toBe(
      PHOTO
    );
    expect(toStoredUploadUrl("https://example.com/mine.jpg")).toBe(
      "https://example.com/mine.jpg"
    );
  });
});
