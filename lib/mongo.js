const mongoose = require('mongoose');

function getMongoUri() {
    return process.env.MONGO_URL ?? process.env.MONGODB_URL;
}

async function connectMongo() {
    const uri = getMongoUri();

    if (!uri) {
        throw new Error('MONGO_URL (or MONGODB_URL) is not defined');
    }

    await mongoose.connect(uri);
    console.log('MongoDB connected');
    return mongoose;
}

module.exports = { mongoose, connectMongo };
