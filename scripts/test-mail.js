#!/usr/bin/env node
const { sendRegistrationPendingEmail, isMailConfigured } = require('../lib/mail');

async function main() {
    if (!isMailConfigured()) {
        console.error('SMTP non configuré — renseigne SMTP_* dans compose.yml (service backend)');
        process.exit(1);
    }

    const to = process.env.MAIL_TEST_TO ?? 'test@example.com';

    await sendRegistrationPendingEmail({
        email: to,
        companyName: 'Société Test',
        contactPhone: '0612345678',
        websiteUrl: 'https://example.com',
    });

    console.log(`Email de test envoyé vers ${to}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
