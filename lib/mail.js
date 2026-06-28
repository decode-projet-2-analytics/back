const nodemailer = require('nodemailer');

let transporter = null;

function parseBoolean(value, defaultValue) {
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
}

function isMailConfigured() {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!user || !pass || user.includes('your-mailtrap') || pass.includes('your-mailtrap')) {
        return false;
    }

    return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

function getTransporter() {
    if (!isMailConfigured()) {
        throw new Error('Mail is not configured');
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: parseBoolean(process.env.SMTP_SECURE, false),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    return transporter;
}

function buildRegistrationPendingContent(data) {
    const subject = 'Inscription reçue — en attente de validation';

    const text = [
        'Bonjour,',
        '',
        'Nous avons bien reçu votre demande d\'inscription sur Decode Analytics.',
        'Votre compte est en attente de validation par un administrateur.',
        '',
        'Récapitulatif :',
        `- Société : ${data.companyName}`,
        `- Email : ${data.email}`,
        `- Téléphone : ${data.contactPhone}`,
        `- Site web : ${data.websiteUrl}`,
        '',
        '— L\'équipe Decode Analytics',
    ].join('\n');

    const html = `
        <p>Bonjour,</p>
        <p>Votre compte est <strong>en attente de validation</strong>.</p>
        <ul>
            <li><strong>Société :</strong> ${data.companyName}</li>
            <li><strong>Email :</strong> ${data.email}</li>
            <li><strong>Téléphone :</strong> ${data.contactPhone}</li>
            <li><strong>Site web :</strong> ${data.websiteUrl}</li>
        </ul>
    `.trim();

    return { subject, text, html };
}

async function sendRegistrationPendingEmail(data) {
    if (!isMailConfigured()) {
        console.warn('[mail] SMTP not configured — registration email skipped');
        return;
    }

    const { subject, text, html } = buildRegistrationPendingContent(data);

    await getTransporter().sendMail({
        from: process.env.MAIL_FROM,
        to: data.email,
        subject,
        text,
        html,
    });
}

function sendRegistrationPendingEmailSafe(data) {
    void sendRegistrationPendingEmail(data).catch((err) => {
        console.error('[mail] Registration confirmation failed:', err);
    });
}

module.exports = {
    isMailConfigured,
    sendRegistrationPendingEmail,
    sendRegistrationPendingEmailSafe,
};
