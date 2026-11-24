import mongoose from "mongoose";

// Menu photos from before PHOTOS-S3, in MongoDB GridFS (VM-02), tagged with their restaurant.
// New photos go to object storage (photo-store.ts). At startup these are copied there under the
// same ids (migrations/gridfs-photos.ts) and marked with `metadata.movedTo`; the files stay for
// one release, in case of a rollback. Nothing writes new photos here any more.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "images" });

export interface LegacyPhoto {
    id: string;
    resId: string;
    length: number;
}

/** Every GridFS call (CL-04). Ids are checked by the services first. */
export interface ImagesRepo {
    /** the photo's size, or null when it isn't this restaurant's */
    find(resId: string, id: string): Promise<{ length: number } | null>;
    stream(id: string): NodeJS.ReadableStream;
    /** deletes the photo if it is this restaurant's */
    remove(resId: string, id: string): Promise<void>;
    /** PHOTOS-S3: the photos not yet copied to object storage */
    unmoved(): Promise<LegacyPhoto[]>;
    read(id: string): Promise<Buffer>;
    /** PHOTOS-S3: records that the photo's copy in object storage is confirmed */
    markMoved(id: string, key: string): Promise<void>;
}

const objectId = (id: string) => new mongoose.mongo.ObjectId(id);

export const mongoImagesRepo: ImagesRepo = {
    async find(resId, id) {
        const file = await bucket()
            .find({ _id: objectId(id), "metadata.resId": resId })
            .next();
        return file ? { length: file.length } : null;
    },
    stream: (id) => bucket().openDownloadStream(objectId(id)),
    async remove(resId, id) {
        if (
            await bucket()
                .find({ _id: objectId(id), "metadata.resId": resId })
                .next()
        )
            await bucket().delete(objectId(id));
    },
    async unmoved() {
        const files = await bucket()
            .find({ "metadata.movedTo": { $exists: false } }) // the driver itself: no sanitizeFilter here
            .toArray();
        return files.map((f) => ({ id: String(f._id), resId: String(f.metadata?.resId ?? ""), length: f.length }));
    },
    async read(id) {
        const chunks: Buffer[] = [];
        for await (const chunk of bucket().openDownloadStream(objectId(id))) chunks.push(chunk as Buffer);
        return Buffer.concat(chunks);
    },
    async markMoved(id, key) {
        await mongoose.connection.db!.collection("images.files").updateOne({ _id: objectId(id) }, { $set: { "metadata.movedTo": key } });
    },
};
