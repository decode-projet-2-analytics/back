import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../lib/mongo';
import { User, App } from '../models';

const TEST_EMAIL = 'test-webmaster@example.com';

async function main() {
    await connectMongo();

    const existing = await User.findOne({ email: TEST_EMAIL });
    if (!existing) {
        console.log('Aucun user de test à supprimer.');
        await disconnectMongo();
        return;
    }

    const appsDeleted = await App.deleteMany({ ownerId: existing._id });
    await User.deleteOne({ _id: existing._id });

    console.log(`Supprimé : 1 user, ${appsDeleted.deletedCount} app(s).`);
    await disconnectMongo();
}

main().catch(async (error) => {
    console.error(error);
    await disconnectMongo().catch(() => undefined);
    process.exit(1);
});
