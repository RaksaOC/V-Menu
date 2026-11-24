import { describe, expect, it } from "vitest";
import { minioPhotoStore, storageConfig } from "../../src/repositories/photo-store.js";
import { MAX_BYTES, newUploadKey, photoKey, uploadOwner } from "../../src/services/photos.js";

// PHOTOS-S3: signing needs no server. The service reaches MinIO inside Docker (minio:9000, which
// doesn't resolve here); browsers get forms and links for the public address.
const RES = "665f00000000000000000001";
const store = () =>
    minioPhotoStore({
        endpoint: "http://minio:9000",
        publicUrl: "https://files.example.com",
        accessKey: "key",
        secretKey: "secret",
        bucket: "vmenu-photos",
        region: "us-east-1",
    });

type Condition = [string, string, string | number] | [string, number, number];
const policyOf = (fields: Record<string, string>) =>
    JSON.parse(Buffer.from(fields.policy!, "base64").toString("utf8")) as { expiration: string; conditions: (Condition | object)[] };

describe("upload keys", () => {
    it("an upload key is incoming/<restaurant>/<random>, and says whose it is", () => {
        const key = newUploadKey(RES);
        expect(key).toMatch(new RegExp(`^incoming/${RES}/[0-9a-f]{32}$`));
        expect(newUploadKey(RES)).not.toBe(key);
        expect(uploadOwner(key)).toBe(RES);
        for (const bad of ["photos/x.webp", `incoming/${RES}/../photos/x`, `incoming/${RES}/abc`, "incoming/abc/" + "0".repeat(32), ""])
            expect(uploadOwner(bad)).toBeNull();
    });

    it("a kept photo is photos/<restaurant>/<id>.webp", () => {
        expect(photoKey(RES, "a".repeat(24))).toBe(`photos/${RES}/${"a".repeat(24)}.webp`);
    });
});

describe("signed upload form (POST policy)", () => {
    it("is for one key, the image type, VM-02's 5 MB and 10 minutes, posted to the public address", async () => {
        const key = newUploadKey(RES);
        const before = Date.now();
        const form = await store().signUpload(key, "image/png", MAX_BYTES);
        expect(form.url).toBe("https://files.example.com/vmenu-photos"); // the browser posts here
        expect(form.key).toBe(key);
        expect(form.maxBytes).toBe(5 * 1024 * 1024);
        expect(form.fields.key).toBe(key);
        expect(form.fields["Content-Type"]).toBe("image/png");
        expect(form.fields["x-amz-algorithm"]).toBe("AWS4-HMAC-SHA256");
        expect(form.fields["x-amz-signature"]).toMatch(/^[0-9a-f]{64}$/);
        expect(form.fields["x-amz-credential"]).toMatch(/^key\/\d{8}\/us-east-1\/s3\/aws4_request$/);

        const policy = policyOf(form.fields);
        expect(policy.conditions).toContainEqual(["eq", "$key", key]);
        expect(policy.conditions).toContainEqual(["eq", "$Content-Type", "image/png"]);
        expect(policy.conditions).toContainEqual(["content-length-range", 1, 5 * 1024 * 1024]);
        expect(policy.conditions).toContainEqual(["eq", "$bucket", "vmenu-photos"]);
        const ttl = Date.parse(policy.expiration) - before;
        expect(ttl).toBeGreaterThan(9.9 * 60_000);
        expect(ttl).toBeLessThanOrEqual(10 * 60_000 + 1000);
        expect(Math.abs(Date.parse(form.expiresAt) - Date.parse(policy.expiration))).toBeLessThan(1000);
    });

    it("uses the internal address when no public one is set", async () => {
        const s = minioPhotoStore({ ...storageConfig({ S3_ENDPOINT: "http://127.0.0.1:9400" }), publicUrl: "" });
        expect((await s.signUpload(newUploadKey(RES), "image/jpeg", MAX_BYTES)).url).toBe("http://127.0.0.1:9400/vmenu-photos");
    });
});

describe("image links", () => {
    it("are signed for the public address and stay the same all day, so browsers cache the image", async () => {
        const s = store();
        const key = photoKey(RES, "a".repeat(24));
        const link = await s.link(key);
        expect(link.startsWith(`https://files.example.com/vmenu-photos/${key}?`)).toBe(true);
        expect(link).toMatch(/X-Amz-Signature=[0-9a-f]{64}/);
        expect(link).toContain("X-Amz-Expires=172800"); // signed at midnight UTC, good for 2 days
        expect(link).toMatch(/X-Amz-Date=\d{8}T000000Z/);
        expect(await s.link(key)).toBe(link);
    });
});

describe("settings", () => {
    it("reads S3_* from the environment, with the local MinIO as the default", () => {
        expect(storageConfig({})).toEqual({
            endpoint: "http://127.0.0.1:9400",
            publicUrl: "",
            accessKey: "",
            secretKey: "",
            bucket: "vmenu-photos",
            region: "us-east-1",
        });
        const c = storageConfig({
            S3_ENDPOINT: "http://minio:9000",
            S3_PUBLIC_URL: "https://files.example.com",
            S3_ACCESS_KEY: "k",
            S3_SECRET_KEY: "s",
            S3_BUCKET: "vmenu-staging",
            S3_REGION: "eu-west-1",
        });
        expect(c).toEqual({
            endpoint: "http://minio:9000",
            publicUrl: "https://files.example.com",
            accessKey: "k",
            secretKey: "s",
            bucket: "vmenu-staging",
            region: "eu-west-1",
        });
    });

    it("refuses an address that isn't http(s)", () => {
        expect(() => minioPhotoStore({ ...storageConfig({}), endpoint: "minio:9000" })).toThrow(/http/);
        expect(() => minioPhotoStore({ ...storageConfig({}), publicUrl: "ftp://files" })).toThrow(/http/);
    });

    it("is not up when nothing answers, and says so quickly", async () => {
        const s = minioPhotoStore({ ...storageConfig({}), endpoint: "http://127.0.0.1:9" });
        const started = Date.now();
        expect(await s.isUp()).toBe(false);
        expect(Date.now() - started).toBeLessThan(4000);
    });
});
