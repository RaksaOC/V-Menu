import mongoose from "mongoose";

// Menu photos live in MongoDB GridFS (VM-02), tagged with their restaurant.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "images" });

/** Every GridFS call (CL-04). Ids are checked by the services first. */
export interface ImagesRepo {
    /** stores a WebP photo; answers its id */
    save(webp: Buffer, resId: string): Promise<string>;
    /** the photo's size, or null when it isn't this restaurant's */
    find(resId: string, id: string): Promise<{ length: number } | null>;
    stream(id: string): NodeJS.ReadableStream;
    /** deletes the photo if it is this restaurant's */
    remove(resId: string, id: string): Promise<void>;
}

const objectId = (id: string) => new mongoose.mongo.ObjectId(id);

export const mongoImagesRepo: ImagesRepo = {
    async save(webp, resId) {
        const id = new mongoose.mongo.ObjectId();
        await new Promise<void>((resolve, reject) => {
            bucket()
                .openUploadStreamWithId(id, `${id}.webp`, { metadata: { resId, contentType: "image/webp" } })
                .on("finish", () => resolve())
                .on("error", reject)
                .end(webp);
        });
        return String(id);
    },
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
};
