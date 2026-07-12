#!/usr/bin/env node
const { sendMail, isMailConfigured, resolveMailProvider } = require('../lib/mail');

async function main() {
    if (!isMailConfigured()) {
        console.error('Mail non configuré — renseigne MAILTRAP_API_TOKEN dans back/.env puis recrée le conteneur backend');
        process.exit(1);
    }

    const to = process.env.MAIL_TEST_TO ?? 'A Test User <avidan.benguigui@ecole-decode.fr>';
    const provider = resolveMailProvider();

    const info = await sendMail({
        to,
        subject: process.env.MAIL_TEST_SUBJECT ?? 'Hello from Mailtrap',
        text: process.env.MAIL_TEST_TEXT ?? 'This is a test e-mail message.',
    });

    console.log(`Message sent: ${info.messageId ?? 'unknown message id'}`);
    console.log(`Email de test envoyé vers ${to} via ${provider.type}`);
    console.log('Mailtrap sent logs: https://mailtrap.io/sending/email_logs');
}

main().catch((err) => {
    if (err?.responseCode === 550 && String(err.response ?? '').includes('Sending from domain')) {
        console.error(err.message);
        console.error('');
        console.error('Mailtrap refuse le domaine de MAIL_FROM.');
        console.error('Corrige back/.env avec une adresse expediteur dont le domaine est verifie dans Mailtrap Sending.');
        console.error('Exemple : MAIL_FROM="Decode Analytics <hello@decode-analytics.fr>"');
        console.error('Puis relance : docker compose up -d --force-recreate backend');
        console.error('Logs Mailtrap : https://mailtrap.io/sending/email_logs');
        process.exit(1);
    }

    console.error(err);
    process.exit(1);
});
