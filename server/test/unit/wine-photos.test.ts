import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DownloadedImage } from "../../src/lib/remote-image.js";

const chatJson = vi.fn();
const downloadImage = vi.fn<(url: string) => Promise<DownloadedImage | null>>();

vi.mock("../../src/lib/ollama.js", () => ({ chatJson }));
vi.mock("../../src/lib/remote-image.js", () => ({ downloadImage }));

const { chooseStorePhoto, labelNamesWine } = await import(
  "../../src/modules/wines/wine-photos.js"
);

const WINE = { name: "Catena Malbec", producer: "Bodega Catena Zapata" };

function image(name: string): DownloadedImage {
  return {
    buffer: Buffer.from(name),
    extension: ".jpg",
    mimetype: "image/jpeg",
  };
}

function candidate(name: string) {
  return {
    imageUrl: `https://cdn.example/${name}.jpg`,
    pageUrl: `https://store.example/${name}`,
  };
}

/** Vision verdicts keyed by the (fake) image contents. */
function verdicts(byImage: Record<string, [boolean, boolean]>) {
  chatJson.mockImplementation(({ images }: { images: string[] }) => {
    const name = Buffer.from(images[0] ?? "", "base64").toString();
    const [showsWine, cleanShot] = byImage[name] ?? [false, false];
    return Promise.resolve({ cleanShot, labelReads: name, showsWine });
  });
}

describe("chooseStorePhoto", () => {
  beforeEach(() => {
    chatJson.mockReset();
    downloadImage.mockReset();
    downloadImage.mockImplementation((url) =>
      Promise.resolve(image(url.split("/").pop()?.replace(".jpg", "") ?? ""))
    );
  });

  it("takes the first clean photo of this exact wine", async () => {
    verdicts({ badges: [true, false], clean: [true, true] });
    const choice = await chooseStorePhoto(WINE, [
      candidate("badges"),
      candidate("clean"),
    ]);
    expect(choice.photo?.buffer.toString()).toBe("clean");
    expect(choice.wrongPages).toEqual([]);
  });

  it("flags stores whose photo shows another wine", async () => {
    verdicts({ badges: [true, false], "dv-catena": [false, true] });
    const choice = await chooseStorePhoto(WINE, [
      candidate("dv-catena"),
      candidate("badges"),
    ]);
    expect(choice.wrongPages).toEqual(["https://store.example/dv-catena"]);
    // No clean shot, so the correct one with badges is still better than none.
    expect(choice.photo?.buffer.toString()).toBe("badges");
  });

  it("trusts a label that names the wine over the model's verdict", async () => {
    // e.g. swayed by medal badges around the bottle
    chatJson.mockResolvedValue({
      cleanShot: false,
      labelReads: "CATENA MALBEC",
      showsWine: false,
    });
    const choice = await chooseStorePhoto(WINE, [candidate("medals")]);
    expect(choice.wrongPages).toEqual([]);
    expect(choice.photo?.buffer.toString()).toBe("medals");
  });

  it("checks at most two photos and skips ones it can't load or read", async () => {
    downloadImage.mockImplementation((url) =>
      Promise.resolve(url.includes("broken") ? null : image("other"))
    );
    verdicts({});
    chatJson.mockRejectedValueOnce(new Error("unsupported image"));

    const choice = await chooseStorePhoto(WINE, [
      candidate("broken"),
      candidate("a"),
      candidate("b"),
      candidate("c"),
    ]);

    expect(chatJson).toHaveBeenCalledTimes(2);
    expect(choice).toEqual({
      photo: null,
      wrongPages: ["https://store.example/b"],
    });
  });
});

describe("labelNamesWine", () => {
  it("matches the wine's name regardless of case, order and producer words", () => {
    expect(labelNamesWine("CATENA MALBEC", WINE)).toBe(true);
    expect(labelNamesWine("Catena Zapata Malbec", WINE)).toBe(true);
  });

  it("rejects other wines and empty readings", () => {
    expect(labelNamesWine("D.V. CATENA Malbec-Malbec", WINE)).toBe(false);
    expect(labelNamesWine("Catena Alta Malbec", WINE)).toBe(false);
    expect(labelNamesWine("", WINE)).toBe(false);
  });
});
