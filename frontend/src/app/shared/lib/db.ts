import mongoose from "mongoose"

let isConnected = false // track the connection status

export const connectToDB = async () => {
    if (isConnected) return

    try {
        await mongoose.connect("mongodb+srv://ocraksa:MyMongo123@cluster0.xdar3x8.mongodb.net/v_menu?retryWrites=true&w=majority&appName=Cluster0", {
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
