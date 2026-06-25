import mongoose from 'mongoose';

export async function connectMongo(): Promise<typeof mongoose> {
    const uri = process.env.MONGO_URL;

    if (!uri) {
        throw new Error('MONGO_URL is not defined in environment variables');
    }

    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected');
        return mongoose;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export async function disconnectMongo(): Promise<void> {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
}

export { mongoose };
