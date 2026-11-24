import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fakeRestaurantLookup, startMemoryMongo } from "@vmenu/common/testing";
import { createApp } from "../../src/app.js";
import { movePhotosToStorage } from "../../src/migrations/gridfs-photos.js";
import { mongoImagesRepo } from "../../src/repositories/images.repo.js";
import { fakePhotoStore } from "../unit/fakes.js";

// PHOTOS-S3: at startup, photos still in MongoDB GridFS (VM-02) are copied to object storage under
// the same ids, so the URLs saved on dishes keep working. GridFS keeps its copy for one release.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.INTERNAL_API_KEY = "internal-test-key";

const A = { _id: "665f00000000000000000001", name: "A", slug: "rest-a", ownerId: "owner-a" };
const B = { _id: "665f00000000000000000002", name: "B", slug: "rest-b", ownerId: "owner-b" };

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;
beforeAll(async () => {
    mongo = await startMemoryMongo("menu-photo-move");
});
afterAll(async () => {
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
});

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "images" });
/** A photo as VM-02 stored it. */
async function gridfsPhoto(resId: string, bytes: string) {
    const id = new mongoose.mongo.ObjectId();
    await new Promise((resolve, reject) =>
        bucket()
            .openUploadStreamWithId(id, `${id}.webp`, { metadata: { resId, contentType: "image/webp" } })
            .on("finish", resolve)
            .on("error", reject)
            .end(Buffer.from(bytes)),
    );
    return String(id);
}
const logs = () => {
    const lines: [string, object][] = [];
    return { lines, info: (o: object, msg: string) => lines.push([msg, o]), warn: (o: object, msg: string) => lines.push([msg, o]) };
};

describe("moving GridFS photos to object storage (PHOTOS-S3)", () => {
    it("copies each photo under the same id, marks it, keeps GridFS, and logs what it moved", async () => {
        const a1 = await gridfsPhoto(A._id, "RIFF0000WEBPa1");
        const a2 = await gridfsPhoto(A._id, "RIFF0000WEBPa2");
        const b1 = await gridfsPhoto(B._id, "RIFF0000WEBPb1");
        const photos = fakePhotoStore();
        const log = logs();

        expect(await movePhotosToStorage(mongoImagesRepo, photos, log)).toEqual({ moved: 3, alreadyThere: 0, failed: 0 });
        expect(photos.objects.get(`photos/${A._id}/${a1}.webp`)).toMatchObject({
            data: Buffer.from("RIFF0000WEBPa1"),
            contentType: "image/webp",
            cacheControl: "public, max-age=31536000, immutable",
        });
        expect(photos.objects.get(`photos/${A._id}/${a2}.webp`)?.data).toEqual(Buffer.from("RIFF0000WEBPa2"));
        expect(photos.objects.get(`photos/${B._id}/${b1}.webp`)?.data).toEqual(Buffer.from("RIFF0000WEBPb1"));

        // GridFS keeps every file for one release, each marked with where it went
        const files = await bucket().find({}).toArray();
        expect(files).toHaveLength(3);
        for (const f of files) expect(f.metadata?.movedTo).toBe(`photos/${f.metadata?.resId}/${f._id}.webp`);
        expect(log.lines).toContainEqual(["moved photos from GridFS to object storage", { moved: 3, alreadyThere: 0, failed: 0 }]);
    });

    it("is safe to run twice: the second run has nothing to do", async () => {
        await gridfsPhoto(A._id, "RIFF0000WEBPa1");
        const photos = fakePhotoStore();
        await movePhotosToStorage(mongoImagesRepo, photos, logs());
        const log = logs();
        expect(await movePhotosToStorage(mongoImagesRepo, photos, log)).toEqual({ moved: 0, alreadyThere: 0, failed: 0 });
        expect(log.lines).toEqual([]);
        expect(photos.objects.size).toBe(1);
    });

    it("a copy already in storage (a run stopped half way) is checked, not copied again", async () => {
        const id = await gridfsPhoto(A._id, "RIFF0000WEBPa1");
        const photos = fakePhotoStore();
        await photos.put(`photos/${A._id}/${id}.webp`, Buffer.from("RIFF0000WEBPa1"), "image/webp");
        let puts = 0;
        photos.failPut = () => (puts++, false);
        expect(await movePhotosToStorage(mongoImagesRepo, photos, logs())).toEqual({ moved: 0, alreadyThere: 1, failed: 0 });
        expect(puts).toBe(0);
        expect((await bucket().find({}).next())?.metadata?.movedTo).toBe(`photos/${A._id}/${id}.webp`);
    });

    it("a photo whose copy fails isn't marked, so the next start tries it again", async () => {
        const ok = await gridfsPhoto(A._id, "RIFF0000WEBPok");
        const bad = await gridfsPhoto(A._id, "RIFF0000WEBPbad");
        const photos = fakePhotoStore();
        photos.failPut = (key) => key.includes(bad);
        const log = logs();
        expect(await movePhotosToStorage(mongoImagesRepo, photos, log)).toEqual({ moved: 1, alreadyThere: 0, failed: 1 });
        expect(log.lines.some(([msg]) => /could not move/.test(msg))).toBe(true);
        const marked = Object.fromEntries((await bucket().find({}).toArray()).map((f) => [String(f._id), f.metadata?.movedTo]));
        expect(marked[ok]).toBe(`photos/${A._id}/${ok}.webp`);
        expect(marked[bad]).toBeUndefined();

        photos.failPut = () => false;
        expect(await movePhotosToStorage(mongoImagesRepo, photos, logs())).toEqual({ moved: 1, alreadyThere: 0, failed: 0 });
        expect(photos.objects.get(`photos/${A._id}/${bad}.webp`)?.data).toEqual(Buffer.from("RIFF0000WEBPbad"));
    });

    it("a copy whose size doesn't match isn't marked as moved", async () => {
        const id = await gridfsPhoto(A._id, "RIFF0000WEBPa1");
        const photos = fakePhotoStore();
        const put = photos.put.bind(photos);
        photos.put = async (key, data, type) => put(key, data.subarray(0, 4), type); // a truncated copy
        expect(await movePhotosToStorage(mongoImagesRepo, photos, logs())).toEqual({ moved: 0, alreadyThere: 0, failed: 1 });
        expect(
            (
                await bucket()
                    .find({ _id: new mongoose.mongo.ObjectId(id) })
                    .next()
            )?.metadata?.movedTo,
        ).toBeUndefined();
    });

    it("when storage is down nothing is marked and nothing is lost", async () => {
        await gridfsPhoto(A._id, "RIFF0000WEBPa1");
        const photos = fakePhotoStore();
        photos.down = true;
        expect(await movePhotosToStorage(mongoImagesRepo, photos, logs())).toEqual({ moved: 0, alreadyThere: 0, failed: 1 });
        expect((await bucket().find({}).next())?.metadata?.movedTo).toBeUndefined();
    });

    it("after the move, the dish's saved URL redirects to the copy in storage", async () => {
        const id = await gridfsPhoto(A._id, "RIFF0000WEBPa1");
        const photos = fakePhotoStore();
        await movePhotosToStorage(mongoImagesRepo, photos, logs());
        const app = createApp({ lookupRestaurant: fakeRestaurantLookup([A, B]), photos });
        const res = await request(app).get(`/api/menu/${A.slug}/images/${id}`);
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain(`/photos/${A._id}/${id}.webp`);
        expect((await request(app).get(`/api/menu/${B.slug}/images/${id}`)).status).toBe(404);
    });
});
