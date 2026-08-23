import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import type { DecodedImage } from "./image-payload.js";

const s3 = new S3Client({
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  endpoint: env.MINIO_ENDPOINT,
  forcePathStyle: true,
  region: "us-east-1",
});

export async function ensureBucketExists(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: env.MINIO_BUCKET }));
  }
}

export async function uploadImage(
  file: Pick<DecodedImage, "buffer" | "extension" | "mimetype">
): Promise<string> {
  const key = `${randomUUID()}${file.extension}`;
  await s3.send(
    new PutObjectCommand({
      Body: file.buffer,
      Bucket: env.MINIO_BUCKET,
      ContentType: file.mimetype,
      Key: key,
    })
  );
  return key;
}

export interface StoredImage {
  body: Readable;
  contentType: string;
}

export async function getImage(key: string): Promise<StoredImage> {
  const object = await s3.send(
    new GetObjectCommand({ Bucket: env.MINIO_BUCKET, Key: key })
  );
  return {
    body: object.Body as Readable,
    contentType: object.ContentType ?? "application/octet-stream",
  };
}

export function publicUrlForImage(key: string): string {
  return new URL(`/uploads/${key}`, env.PUBLIC_URL).toString();
}
