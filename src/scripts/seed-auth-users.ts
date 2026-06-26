import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../lib/mongo';
import { User } from '../models';

const ADMIN_EMAIL = 'admin@decode.local';
const WEBMASTER_EMAIL = 'webmaster@decode.local';
const PASSWORD = 'TestPassword123!';

async function main() {
    await connectMongo();

    await User.deleteMany({ email: { $in: [ADMIN_EMAIL, WEBMASTER_EMAIL] } });

    await User.create({
        email: ADMIN_EMAIL,
        password: PASSWORD,
        role: 'admin',
        status: 'validated',
    });

    await User.create({
        email: WEBMASTER_EMAIL,
        password: PASSWORD,
        role: 'webmaster',
        status: 'validated',
        companyName: 'Decode Demo',
        kbisDocument: '/uploads/kbis-demo.pdf',
        contactPhone: '0600000000',
        websiteUrl: 'https://decode.local',
    });

    console.log('Utilisateurs auth de test créés :');
    console.log(`  admin      → ${ADMIN_EMAIL} / ${PASSWORD}`);
    console.log(`  webmaster  → ${WEBMASTER_EMAIL} / ${PASSWORD}`);

    await disconnectMongo();
}

main().catch(async (error) => {
    console.error(error);
    await disconnectMongo().catch(() => undefined);
    process.exit(1);
});
