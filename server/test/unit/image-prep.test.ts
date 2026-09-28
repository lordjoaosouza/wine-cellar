import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  prepareLabelScanForVision,
  prepareStorePhotoForVision,
  visionMaxSide,
} from "../../src/lib/image-prep.js";

function solid(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { background: "#803050", channels: 3, height, width },
  })
    .png()
    .toBuffer();
}

describe("image preparation for the vision model", () => {
  it("shrinks store photos to 768px on the long side and encodes JPEG", async () => {
    const prepared = await prepareStorePhotoForVision(await solid(2000, 3000));
    const { format, height, width } = await sharp(prepared).metadata();
    expect({ format, height, width }).toEqual({
      format: "jpeg",
      height: visionMaxSide("store"),
      width: 512,
    });
  });

  it("keeps label scans a bit larger so small print survives", async () => {
    const prepared = await prepareLabelScanForVision(await solid(3024, 4032));
    const { height } = await sharp(prepared).metadata();
    expect(height).toBe(visionMaxSide("label"));
  });

  it("never enlarges small images", async () => {
    const prepared = await prepareStorePhotoForVision(await solid(200, 300));
    const { height, width } = await sharp(prepared).metadata();
    expect({ height, width }).toEqual({ height: 300, width: 200 });
  });

  it("returns the original bytes when the input is not an image", async () => {
    const junk = Buffer.from("not an image");
    expect(await prepareLabelScanForVision(junk)).toBe(junk);
  });
});
