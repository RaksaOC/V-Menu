import {
    CreateBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    PutBucketLifecycleConfigurationCommand,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// PHOTOS-S3: menu photos live in S3-compatible object storage (MinIO), not in MongoDB.
//
// Keys in the bucket (the rules about them are in services/photos.ts):
//   incoming/<resId>/<random>   a browser upload that hasn't been checked yet; a lifecycle rule
//                               deletes these after a day
//   photos/<resId>/<id>.webp    a checked, re-encoded photo; never changes once written
//
// Uploads are signed POST policies: the browser sends the photo straight to storage, and storage
// itself enforces the key, the image type, the size and the time limit. Reads are signed GET links.
//
// Two clients: one for this service's own reads and writes, on the internal address (inside
// Docker, http://minio:9000), and one only for signing what the browser uses, on the public
// address (https://files.example.com). Signing makes no network call.

/** A photo, once written, never changes: browsers and proxies may keep it for a year. */
export const IMMUTABLE = "public, max-age=31536000, immutable";
const UPLOAD_TTL_SECONDS = 10 * 60;
const LINK_TTL_SECONDS = 2 * 24 * 60 * 60; // signed at midnight UTC, so a link is good all day and the next
const READY_TIMEOUT_MS = 2000;

export interface StorageConfig {
    /** where this service reaches storage, e.g. http://minio:9000 */
    endpoint: string;
    /** where browsers reach it, e.g. https://files.example.com; empty means the same as endpoint */
    publicUrl: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
}

/** The S3_* settings (.env.example), with the local MinIO of infra/compose as the default. */
export function storageConfig(env: Record<string, string | undefined> = process.env): StorageConfig {
    return {
        endpoint: env.S3_ENDPOINT || "http://127.0.0.1:9400",
        publicUrl: env.S3_PUBLIC_URL ?? "",
        accessKey: env.S3_ACCESS_KEY ?? "",
        secretKey: env.S3_SECRET_KEY ?? "",
        bucket: env.S3_BUCKET || "vmenu-photos",
        region: env.S3_REGION || "us-east-1",
    };
}

export interface SignedUpload {
    key: string;
    /** the browser POSTs the form here */
    url: string;
    /** form fields to send before the file (the file field goes last) */
    fields: Record<string, string>;
    expiresAt: string;
    maxBytes: number;
}

/** Every object storage call (CL-04). Keys are checked by the services first. */
export interface PhotoStore {
    /** Makes the bucket and the clean-up rule if they're missing. */
    setup(): Promise<void>;
    signUpload(key: string, contentType: string, maxBytes: number, ttlSeconds?: number): Promise<SignedUpload>;
    /** the object's size in bytes, or null when there's no such object */
    size(key: string): Promise<number | null>;
    get(key: string): Promise<Buffer>;
    put(key: string, data: Buffer, contentType: string): Promise<void>;
    delete(keys: string[]): Promise<void>;
    /** a signed GET link for browsers */
    link(key: string): Promise<string>;
    isUp(): Promise<boolean>;
}

function client(url: string, { accessKey, secretKey, region }: StorageConfig) {
    const u = URL.canParse(url) ? new URL(url) : null;
    if (!u || !["http:", "https:"].includes(u.protocol)) throw new Error(`object storage address must be an http(s) URL: ${url}`);
    return new S3Client({
        endpoint: u.origin,
        region, // given, so the client never asks the server for it (signing stays offline)
        forcePathStyle: true, // http://host/bucket/key: MinIO, and no wildcard DNS needed
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        // short timeouts and one retry: a health check must answer quickly when storage is down
        requestHandler: { connectionTimeout: 3000, requestTimeout: 30_000 },
        maxAttempts: 2,
        // checksums only where S3 requires them, which every MinIO release understands
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });
}

const notFound = (err: unknown) =>
    err instanceof S3ServiceException && (err.$metadata.httpStatusCode === 404 || err.name === "NotFound" || err.name === "NoSuchKey");

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(fallback), ms);
        p.then(
            (v) => resolve(v),
            () => resolve(fallback),
        ).finally(() => clearTimeout(timer));
    });
}

export function minioPhotoStore(config: StorageConfig): PhotoStore {
    const { bucket } = config;
    const io = client(config.endpoint, config);
    const signer = client(config.publicUrl || config.endpoint, config);

    return {
        async setup() {
            try {
                await io.send(new HeadBucketCommand({ Bucket: bucket }));
            } catch (err) {
                if (!notFound(err)) throw err;
                await io.send(new CreateBucketCommand({ Bucket: bucket }));
            }
            await io.send(
                new PutBucketLifecycleConfigurationCommand({
                    Bucket: bucket,
                    LifecycleConfiguration: {
                        Rules: [
                            { ID: "drop-unchecked-uploads", Status: "Enabled", Filter: { Prefix: "incoming/" }, Expiration: { Days: 1 } },
                        ],
                    },
                }),
            );
        },

        async signUpload(key, contentType, maxBytes, ttlSeconds = UPLOAD_TTL_SECONDS) {
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            const { url, fields } = await createPresignedPost(signer, {
                Bucket: bucket,
                Key: key,
                Fields: { "Content-Type": contentType },
                Conditions: [
                    ["eq", "$bucket", bucket],
                    ["eq", "$key", key],
                    ["eq", "$Content-Type", contentType],
                    ["content-length-range", 1, maxBytes],
                ],
                Expires: ttlSeconds,
            });
            return { key, url, fields, expiresAt: expiresAt.toISOString(), maxBytes };
        },

        async size(key) {
            try {
                return (await io.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength ?? 0;
            } catch (err) {
                if (notFound(err)) return null;
                throw err;
            }
        },

        async get(key) {
            const res = await io.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            return Buffer.from(await res.Body!.transformToByteArray());
        },

        async put(key, data, contentType) {
            await io.send(
                new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType, CacheControl: IMMUTABLE }),
            );
        },

        async delete(keys) {
            // one at a time: a photo delete is one or two keys, and DeleteObject needs no checksum
            for (const key of keys) await io.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        },

        async link(key) {
            const midnight = new Date();
            midnight.setUTCHours(0, 0, 0, 0);
            return getSignedUrl(signer, new GetObjectCommand({ Bucket: bucket, Key: key }), {
                expiresIn: LINK_TTL_SECONDS,
                signingDate: midnight,
            });
        },

        isUp() {
            return withTimeout(
                io.send(new HeadBucketCommand({ Bucket: bucket })).then(() => true),
                READY_TIMEOUT_MS,
                false,
            );
        },
    };
}
