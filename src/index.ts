import 'dotenv/config';
import app from './app';
import { connectMongo } from './lib/mongo';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
}

bootstrap().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
