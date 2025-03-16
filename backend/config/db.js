import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("connected");
    } catch (err) {
        console.error("Database connection failed", err);
        process.exit(1);
    }
};

export default connectDB;
