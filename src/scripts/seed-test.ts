import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { connectMongo, disconnectMongo } from '../lib/mongo';
import { User, App } from '../models';

const TEST_EMAIL = 'test-webmaster@example.com';

async function main() {
    await connectMongo();

    // Nettoyage d'un éventuel run précédent
    const existing = await User.findOne({ email: TEST_EMAIL });
    if (existing) {
        await App.deleteMany({ ownerId: existing._id });
        await User.deleteOne({ _id: existing._id });
        console.log('Ancien jeu de test supprimé.');
    }

    const user = await User.create({
        email: TEST_EMAIL,
        password: 'TestPassword123!',
        role: 'webmaster',
        companyName: 'Ma Société Test',
        kbisDocument: '/uploads/kbis-test.pdf',
        contactPhone: '0612345678',
        websiteUrl: 'https://example.com',
        status: 'pending',
    });

    const plainSecret = randomUUID();
    const app = new App({
        name: 'Showcase Demo',
        ownerId: user._id,
        allowedUrls: ['http://localhost:3001'],
    });
    (app as import('../models/app.model').IApp & { _plainSecret?: string })._plainSecret = plainSecret;
    await app.save();

    const userWithApps = await User.findById(user._id).populate('apps');
    const userWithPassword = await User.findOne({ email: TEST_EMAIL }).select('+password');
    const appWithSecret = await App.findById(app._id).select('+appSecretHash');

    const passwordOk = userWithPassword
        ? await userWithPassword.comparePassword('TestPassword123!')
        : false;
    const secretOk = appWithSecret ? await appWithSecret.compareSecret(plainSecret) : false;

    console.log('\n--- Résultat ---');
    console.log('User (sans password):', user.toJSON());
    console.log('Apps du user:', userWithApps?.apps);
    console.log('App (sans secret):', app.toJSON());
    console.log('Secret en clair (à noter une seule fois):', plainSecret);
    console.log('comparePassword OK:', passwordOk);
    console.log('compareSecret OK:', secretOk);
    console.log('Password hashé en base:', userWithPassword?.password?.startsWith('$2'));
    console.log('Secret hashé en base:', appWithSecret?.appSecretHash?.startsWith('$2'));

    if (!passwordOk || !secretOk) {
        throw new Error('Échec de la vérification bcrypt');
    }

    console.log('\nTest OK - user + app créés en base.');
    await disconnectMongo();
}

main().catch(async (error) => {
    console.error(error);
    await disconnectMongo().catch(() => undefined);
    process.exit(1);
});
