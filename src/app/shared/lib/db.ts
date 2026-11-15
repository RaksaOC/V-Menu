import mongoose from "mongoose"

let isConnected = false // track the connection status

export const connectToDB = async () => {
    if (isConnected) return

    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)")

    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        } as any) // casting to `any` if TS complains

        isConnected = true
        console.log("✅ MongoDB connected")
    } catch (err) {
        console.error("❌ MongoDB connection error:", err)
        throw err
    }
}
