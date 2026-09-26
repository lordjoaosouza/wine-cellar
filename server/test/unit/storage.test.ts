import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { text } from "node:stream/consumers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const dir = await mkdtemp(path.join(tmpdir(), "wine-cellar-uploads-"));
vi.stubEnv("UPLOADS_DIR", dir);

const { ensureUploadsDirExists, getImage, publicUrlForImage, uploadImage } =
  await import("../../src/lib/storage.js");

const KEY_PATTERN = /^[0-9a-f-]{36}\.png$/;

describe("filesystem storage", () => {
  beforeAll(ensureUploadsDirExists);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { force: true, recursive: true });
  });

  it("stores an image and streams it back with its content type", async () => {
    const key = await uploadImage({
      buffer: Buffer.from("fake-png"),
      extension: ".png",
      mimetype: "image/png",
    });

    expect(key).toMatch(KEY_PATTERN);
    expect(await readFile(path.join(dir, key), "utf8")).toBe("fake-png");

    const image = await getImage(key);
    expect(image.contentType).toBe("image/png");
    expect(await text(image.body)).toBe("fake-png");
  });

  it("rejects keys that could escape the uploads directory", async () => {
    await expect(getImage("../../etc/passwd")).rejects.toMatchObject({
      status: 404,
    });
    await expect(getImage("not-a-uuid.png")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("fails for a well-formed key that was never stored", async () => {
    await expect(
      getImage("00000000-0000-4000-8000-000000000000.jpg")
    ).rejects.toThrow();
  });

  it("stores photos as relative /uploads paths", () => {
    expect(publicUrlForImage("abc.png")).toBe("/uploads/abc.png");
  });
});
